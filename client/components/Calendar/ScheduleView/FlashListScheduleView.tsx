import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format, isToday, parseISO, addMonths, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { EventOccurrence } from '@/utils/eventUtils';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { useCalendarContext } from '@/context/CalendarProvider.v2';
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
  const { view, lastViewChangeSource } = useCalendarViewContext();
  const { currentDate, eventOccurrences, loading, refreshEvents } = useCalendarContext();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const flashListRef = useRef<FlashList<ListItem>>(null);
  const height = Dimensions.get('window').height;
  const tabBarHeight = useBottomTabBarHeight();
  const lastScrolledDate = useRef<Date | null>(null);
  const previousView = useRef<string>(view);
  const isInitialLoad = useRef<boolean>(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef3 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Create shared values for worklet-safe state
  const scrollOffset = useSharedValue(0);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (timeoutRef2.current) {
        clearTimeout(timeoutRef2.current);
        timeoutRef2.current = null;
      }
      if (timeoutRef3.current) {
        clearTimeout(timeoutRef3.current);
        timeoutRef3.current = null;
      }
    };
  }, []);

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

    // Remove duplicate occurrences before grouping - use Set for O(1) performance
    const seen = new Set<string>();
    const uniqueOccurrences = eventOccurrences.filter((occurrence) => {
      if (!occurrence || !occurrence.date) return false;
      
      const key = `${occurrence.id}-${format(occurrence.date, 'yyyy-MM-dd')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Group events by date
    const grouped = uniqueOccurrences.reduce((acc, occurrence) => {
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
            key: `event-${occurrence.id}`, // Use occurrence.id for unique keys
          }));

        return [headerItem, ...eventItems];
      });
  }, [eventOccurrences]);

  const stickyHeaderIndices = useMemo(() => {
    const indices: number[] = [];
    listData.forEach((item, index) => {
      if (item.type === 'header') {
        indices.push(index);
      }
    });
    return indices;
  }, [listData]);

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

  // Effect to handle refreshing when schedule view is active
  useEffect(() => {
    // Only handle refreshing when schedule view is active
    if (view.toLowerCase() !== 'schedule') return;

    const handleScheduleRefresh = async () => {
      if (refreshing) {
        try {
          await refreshEvents();
          if (onFinishRefresh) {
            onFinishRefresh();
          }
        } catch (error) {
          console.error('Error refreshing schedule events:', error);
          if (onFinishRefresh) {
            onFinishRefresh();
          }
        }
      }
    };

    handleScheduleRefresh();
  }, [view, refreshing]); // CalendarProvider.v2 handles data fetching automatically

  // Main effect to handle scrolling logic
  useEffect(() => {
    if (view.toLowerCase() !== 'schedule' || listData.length === 0) return;

    const isViewChange = previousView.current !== view;
    
    // Update previous view
    previousView.current = view;

    // For day cell clicks, we want to scroll directly to the selected date without going to today first
    if (isViewChange && lastViewChangeSource === 'day_cell') {
      // Day cell was clicked - scroll directly to the selected date without animation
      if (currentDate) {
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            scrollToDate(currentDate, false);
          }
        }, 50);
      }
      return; // Exit early to prevent other logic from running
    }

    // For header picker changes or initial load (but not day cell clicks), scroll to today
    if ((isInitialLoad.current && lastViewChangeSource !== 'day_cell') || (isViewChange && lastViewChangeSource === 'header_picker')) {
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
        timeoutRef2.current = setTimeout(() => {
          if (mountedRef.current) {
            scrollToDate(targetDate!, true); // Animated scroll for view changes
            isInitialLoad.current = false;
          }
        }, 100);
      }
      return; // Exit early
    }

    // Handle date changes while already in schedule view (like current month selector clicks)
    if (!isViewChange && currentDate && (!lastScrolledDate.current || !isSameDay(currentDate, lastScrolledDate.current))) {
      timeoutRef3.current = setTimeout(() => {
        if (mountedRef.current) {
          scrollToDate(currentDate, true);
        }
      }, 50); // Animated for month selector
    }
  }, [view, currentDate, listData.length, scrollToDate, lastViewChangeSource]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      // Check if this date is today (computed once per render)
      const itemIsToday = item.date ? isToday(parseISO(item.date)) : false;
      
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
            {itemIsToday && (
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
    
    // Pre-calculate time and endTime to avoid doing it in ScheduleEventView
    const startTime = event.start_time ? new Date(event.start_time) : new Date();
    const endTime = event.end_time ? new Date(event.end_time) : new Date();
    const formattedTime = format(startTime, 'h:mm a');
    
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <ScheduleEventView
          title={event.title}
          time={formattedTime}
          endTime={endTime}
          location={event.location?.text || ''}
          userStatus={event.userStatus ?? undefined}
          eventOccurrence={occurrence}
        />
      </View>
    );
  }, [themeColors]);

  // Stable callbacks for FlashList props
  const getItemType = useCallback((item: ListItem) => item.type, []);
  const keyExtractor = useCallback((item: ListItem) => item.key, []);

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
        getItemType={getItemType}
        keyExtractor={keyExtractor}
        stickyHeaderIndices={stickyHeaderIndices}
      />
    </View>
  );
};

export default FlashListScheduleView; 