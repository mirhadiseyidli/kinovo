import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format, isToday, parseISO, addMonths, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEventContext } from '@/context/UserSessionContext';
import { EventOccurrence } from '@/utils/eventUtils';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { useCalendarContext } from '@/context/CalendarContext';
import ScheduleEventView from './ScheduleEventView';

// Helper type for our list items
type ListItem = {
  type: 'header' | 'event';
  date?: string;
  title?: string;
  occurrence?: EventOccurrence;
  key: string;
};

interface ScheduleViewProps {
  refreshing?: boolean;
  onFinishRefresh?: () => void;
}

const FlashListScheduleView: React.FC<ScheduleViewProps> = ({ refreshing, onFinishRefresh }) => {
  const { fetchEventsForDateRange, eventOccurrences, loading } = useEventContext();
  const { view } = useCalendarViewContext();
  const { currentDate } = useCalendarContext();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const flashListRef = useRef<FlashList<ListItem>>(null);
  const height = Dimensions.get('window').height;
  const tabBarHeight = useBottomTabBarHeight();
  const lastScrolledDate = useRef<Date | null>(null);

  // Create shared values for worklet-safe state
  const scrollOffset = useSharedValue(0);

  // Worklet-safe scroll handler
  const scrollToOffset = useCallback((offset: number, animated: boolean = true) => {
    flashListRef.current?.scrollToOffset({
      offset,
      animated,
    });
  }, []);

  // Worklet-safe scroll animation
  const animateToOffset = useCallback((targetOffset: number) => {
    'worklet';
    scrollOffset.value = withTiming(targetOffset, {
      duration: 800,
    }, (finished) => {
      if (finished) {
        runOnJS(scrollToOffset)(targetOffset);
      }
    });
  }, [scrollToOffset]);

  // Transform event occurrences into a flat list of headers and events
  const listData = useMemo(() => {
    if (!eventOccurrences || eventOccurrences.length === 0) {
      return [];
    }

    // Group events by date
    const grouped = eventOccurrences.reduce((acc, occurrence) => {
      if (!occurrence || !occurrence.date) return acc;
      
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(occurrence);
      return acc;
    }, {} as Record<string, EventOccurrence[]>);

    // Sort dates and create flat list of headers and events
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .flatMap(([dateKey, occurrences]) => {
        const parsedDate = parseISO(dateKey);
        const headerItem: ListItem = {
          type: 'header',
          date: dateKey,
          title: format(parsedDate, 'EEEE, MMMM d'),
          key: `header-${dateKey}`,
        };

        const eventItems: ListItem[] = occurrences
          .sort((a, b) => {
            const timeA = a.event.start_time ? new Date(a.event.start_time).getTime() : 0;
            const timeB = b.event.start_time ? new Date(b.event.start_time).getTime() : 0;
            return timeA - timeB;
          })
          .map(occurrence => ({
            type: 'event',
            occurrence,
            key: `event-${occurrence.event._id}-${dateKey}`,
          }));

        return [headerItem, ...eventItems];
      });
  }, [eventOccurrences]);

  const stickyHeaderIndices = useMemo(() => 
    listData.map((item, index) => item.type === 'header' ? index : -1).filter(index => index !== -1)
  , [listData]);

  // Function to scroll to a specific date
  const scrollToDate = useCallback((date: Date, animated = true) => {
    if (!listData || !date || !flashListRef.current) return;

    const targetDateStr = format(date, 'yyyy-MM-dd');
    const targetIndex = listData.findIndex(
      item => item.type === 'header' && item.date === targetDateStr
    );

    if (targetIndex !== -1) {
      try {
        flashListRef.current.scrollToIndex({
          index: targetIndex,
          animated,
        });
        lastScrolledDate.current = date;
      } catch (error) {
        console.warn(`Failed to scroll to index ${targetIndex}.`, error);
      }
    }
  }, [listData]);

  // Effect to handle initial load and view changes to 'schedule'
  useEffect(() => {
    if (view.toLowerCase() === 'schedule') {
      const findAndScrollToTarget = () => {
        if (listData.length === 0) return;

        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        // Find header for today or the first one after today
        const targetHeader = listData.find(item => item.type === 'header' && item.date! >= todayStr);
        
        let targetDate: Date | null = null;
        if (targetHeader && targetHeader.date) {
          targetDate = parseISO(targetHeader.date);
        } else if (listData.length > 0) {
          // Fallback to the very first date in the list if no future/today date is found
          const firstHeader = listData.find(item => item.type === 'header');
          if (firstHeader && firstHeader.date) {
            targetDate = parseISO(firstHeader.date);
          }
        }
        
        if (targetDate) {
          // Use a timeout to ensure the list has had time to render.
          setTimeout(() => scrollToDate(targetDate!, false), 100);
        }
      };

      findAndScrollToTarget();
    }
  }, [view, listData, scrollToDate]);

  useEffect(() => {
    // Only fetch events when schedule view is active
    if (view.toLowerCase() !== 'schedule') return;

    const fetchScheduleEvents = async () => {
      try {
        // Fetch events for a broader range - from current month to 6 months ahead
        const now = new Date();
        const startDate = startOfMonth(now);
        const endDate = endOfMonth(addMonths(now, 6)); // 6 months ahead
        
        await fetchEventsForDateRange(startDate, endDate);
        
        // After fetching events, scroll to current date
        if (currentDate) {
          // Small delay to ensure listData is updated
          setTimeout(() => {
            scrollToDate(currentDate);
          }, 100);
        }
        
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      } catch (error) {
        console.error('Error fetching schedule events:', error);
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      }
    };

    fetchScheduleEvents();
  }, [fetchEventsForDateRange, view, refreshing, onFinishRefresh]);

  // Effect for scrolling when a day is selected from another view
  useEffect(() => {
    if (view.toLowerCase() === 'schedule' && currentDate && (!lastScrolledDate.current || !isSameDay(currentDate, lastScrolledDate.current))) {
      // Small delay to allow UI to update before scrolling
      setTimeout(() => scrollToDate(currentDate), 100);
    }
  }, [view, currentDate, scrollToDate]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={{ 
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: themeColors.background,
        }}>
          <Text style={{ 
            fontSize: 18,
            fontWeight: '600',
            color: themeColors.text,
          }}>
            {item.title}
            {isToday(parseISO(item.date!)) && (
              <Text style={{ 
                color: themeColors.mountainGreen,
                marginLeft: 8,
              }}> • Today</Text>
            )}
          </Text>
        </View>
      );
    }

    const occurrence = item.occurrence!;
    const event = occurrence.event;
    
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <ScheduleEventView
          title={event.title}
          time={format(event.start_time ? new Date(event.start_time) : new Date(), 'h:mm a')}
          location={event.location?.text || ''}
          userStatus={event.userStatus}
          eventOccurrence={occurrence}
        />
      </View>
    );
  }, [themeColors]);

  return (
    <View style={{ flex: 1 }}>
      {(loading || refreshing)  && (
        <View style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2
        }}>
            <ReanimatedShimmerLine />
        </View>
      )}
      <FlashList
        ref={flashListRef}
        data={listData}
        renderItem={renderItem}
        estimatedItemSize={100}
        refreshing={refreshing || loading}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        getItemType={(item) => item.type}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={stickyHeaderIndices}
      />
    </View>
  );
};

export default FlashListScheduleView; 