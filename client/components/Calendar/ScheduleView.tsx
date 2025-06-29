import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, SectionList, Dimensions, ActivityIndicator } from 'react-native';
import ScheduleEventView from './ScheduleView/ScheduleEventView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { format, isToday, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Event } from '@/types/allTypes';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { InteractionManager } from 'react-native';
import { useEventContext } from '@/context/UserSessionContext';
import { EventOccurrence } from '@/utils/eventUtils';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { useCalendarContext } from '@/context/CalendarContext';

const groupOccurrencesByDate = (occurrences: EventOccurrence[]) => {
  if (!occurrences || !Array.isArray(occurrences)) {
    return {};
  }
  
  return occurrences.reduce((acc, occurrence) => {
    if (!occurrence || !occurrence.date) return acc;
    
    const dateKey = format(occurrence.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(occurrence);
    return acc;
  }, {} as Record<string, EventOccurrence[]>);
};

interface ScheduleViewProps {
  refreshing?: boolean;
  onFinishRefresh?: () => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ refreshing, onFinishRefresh }) => {
  const { fetchEventsForDateRange, eventOccurrences, loading } = useEventContext();
  const { view } = useCalendarViewContext();
  const { currentDate } = useCalendarContext();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const sectionListRef = useRef<SectionList>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate || new Date());
  const [currentDateString, setCurrentDateString] = useState<string>(
    format(currentDate || new Date(), 'yyyy-MM-dd')
  );
  const height = Dimensions.get('window').height;
  const tabBarHeight = useBottomTabBarHeight();

  // Create shared values for worklet-safe state
  const scrollOffset = useSharedValue(0);

  // Worklet-safe scroll handler
  const scrollToSection = useCallback((offset: number, animated: boolean = true) => {
    const flatListRef = (sectionListRef.current as any)?._listRef;
    if (flatListRef) {
      flatListRef.scrollToOffset({
        offset,
        animated,
      });
    } else {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: Math.floor(offset / 100), // Approximate section index
        itemIndex: 0,
        viewPosition: 0,
        viewOffset: 0,
        animated,
      });
    }
  }, []);

  // Worklet-safe scroll animation
  const animateToSection = useCallback((targetOffset: number) => {
    'worklet';
    scrollOffset.value = withTiming(targetOffset, {
      duration: 800,
    }, (finished) => {
      if (finished) {
        runOnJS(scrollToSection)(targetOffset);
      }
    });
  }, [scrollToSection]);

  // Update selectedDate when currentDate changes (from navigation)
  useEffect(() => {
    if (currentDate) {
      const newDate = new Date(currentDate);
      const newDateString = format(newDate, 'yyyy-MM-dd');
      
      if (newDateString !== currentDateString) {
        setSelectedDate(newDate);
        setCurrentDateString(newDateString);
      }
    }
  }, [currentDate?.getTime(), currentDateString]);

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
        
        // Call onFinishRefresh if it exists and we're refreshing
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      } catch (error) {
        console.error('Error fetching schedule events:', error);
        // Still call onFinishRefresh on error to reset the refresh state
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      }
    };

    fetchScheduleEvents();
  }, [fetchEventsForDateRange, view, refreshing, onFinishRefresh]);

  // Memoize expensive date calculations
  const dateFilters = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    // Start from either 3 days before selected date or today, whichever is earlier
    const threeDaysBeforeSelected = new Date(selectedDateOnly);
    threeDaysBeforeSelected.setDate(threeDaysBeforeSelected.getDate() - 3);
    
    const startDate = threeDaysBeforeSelected < today ? threeDaysBeforeSelected : today;
    
    return {
      startDate,
      startDateISOString: startDate.toISOString().split('T')[0]
    };
  }, [selectedDate]);

  const grouped = useMemo(() => {
    if (!eventOccurrences || eventOccurrences.length === 0) {
      return {};
    }

    const result = groupOccurrencesByDate(eventOccurrences);
    const { startDate } = dateFilters;
    
    const filteredResult: Record<string, EventOccurrence[]> = {};
    Object.entries(result).forEach(([dateKey, occurrences]) => {
      // Use cached date parsing where possible
      const eventDate = parseISO(dateKey);
      if (eventDate >= startDate) {
        // Sort events by start time within each day (memoized)
        filteredResult[dateKey] = (occurrences as EventOccurrence[]).sort((a, b) => {
          const timeA = a.event.start_time ? new Date(a.event.start_time).getTime() : 0;
          const timeB = b.event.start_time ? new Date(b.event.start_time).getTime() : 0;
          return timeA - timeB;
        });
      }
    });
    
    return filteredResult;
  }, [eventOccurrences, dateFilters]);

  const sections = useMemo(() => {
    if (!grouped || Object.keys(grouped).length === 0) {
      return [];
    }

    // Pre-calculate date objects to avoid repeated parsing
    const sectionsWithDates = Object.entries(grouped)
      .map(([dateKey, data]) => {
        if (!data || !Array.isArray(data)) {
          return null;
        }
        
        try {
          // Parse the date key (yyyy-MM-dd format) to create proper Date object
          const parsedDate = parseISO(dateKey);
          
          return {
            title: format(parsedDate, 'EEEE, MMMM d'),
            date: parsedDate,
            key: dateKey,
            data, // Data is already sorted from grouped calculation
          };
        } catch (error) {
          console.error('Error formatting date:', dateKey, error);
          return null;
        }
      })
      .filter((section): section is { title: string; date: Date; key: string; data: EventOccurrence[] } => section !== null);

    // Sort sections by date and return final format
    return sectionsWithDates
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(section => ({
        title: section.title,
        key: section.key,
        data: section.data
      }));
  }, [grouped]);

  // Constants for calculating section sizes
  const HEADER_HEIGHT = 8 /* paddingTop */ + 16 /* fontSize */ + 12 /* marginBottom */;
  const EVENT_HEIGHT = 86;  // height of each event row
  const EVENT_GAP = 8;      // vertical gap between event rows

  // Calculate total height for each section: header + events + gaps
  const sectionHeights = useMemo(() => {
    return sections.map(section => {
      const eventCount = section.data?.length || 0;
      const gapsHeight = eventCount > 1 ? (eventCount - 1) * EVENT_GAP : 0;
      return HEADER_HEIGHT + (eventCount * EVENT_HEIGHT) + gapsHeight;
    });
  }, [sections]);

  const dynamicPadding = useMemo(() => {
    if (!selectedDate || sections.length === 0) return 0;

    try {
      const selectedKey = format(selectedDate, 'EEEE, MMMM d');
      const selectedIndex = sections.findIndex(section => section.title === selectedKey);
      if (selectedIndex < 0) return 0;

      // Sum heights of all sections below the selected one
      const followingHeightsSum = sectionHeights
        .slice(selectedIndex + 1)
        .reduce((sum, h) => sum + h, 0);

      // If the remaining content is shorter than the screen, pad to fill
      return followingHeightsSum < height ? (height - followingHeightsSum - tabBarHeight) : 0;
    } catch (error) {
      console.error('Error calculating dynamic padding:', error);
      return 0;
    }
  }, [sectionHeights, selectedDate, grouped, height, sections]);

  // Scroll to selected date ONLY when sections change AND we have a valid target
  useEffect(() => {
    if (!sections.length) return;
  
    const targetKey = format(selectedDate, 'yyyy-MM-dd');
    const sectionIndex = sections.findIndex(section => section.key === targetKey);
    
    if (sectionIndex >= 0) {
      // Found exact match - scroll to it
      let offset = 0;
      for (let i = 0; i < sectionIndex; i++) {
        offset += sectionHeights[i] || 0;
      }
      animateToSection(offset);
    } else {
      // No exact match - find closest future date
      const targetTime = selectedDate.getTime();
      let closestIndex = -1;
      let closestDistance = Infinity;
      
      sections.forEach((section, index) => {
        const sectionDate = parseISO(section.key);
        if (sectionDate >= selectedDate) { // Only consider future dates
          const distance = sectionDate.getTime() - targetTime;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });
      
      if (closestIndex >= 0) {
        let offset = 0;
        for (let i = 0; i < closestIndex; i++) {
          offset += sectionHeights[i] || 0;
        }
        animateToSection(offset);
      }
    }
  }, [sections, format(selectedDate, 'yyyy-MM-dd'), sectionHeights, animateToSection]);

  // Remove loading fallback and empty state fallback
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ReanimatedShimmerLine />
      </View>
    );
  }

  return (
    <SectionList
      ref={sectionListRef}
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      stickySectionHeadersEnabled={true}
      contentContainerStyle={{ 
        minHeight: height + dynamicPadding,
        paddingHorizontal: 16, 
        paddingBottom: tabBarHeight + dynamicPadding,
        gap: 8
      }}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({ section: { title, key } }) => (
        <ThemedView key={`header-${key}`} style={{ 
          paddingTop: 8,
          backgroundColor: themeColors.background,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border,
          paddingBottom: 4
        }}>
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            fontWeight: '700', 
            marginBottom: 12, 
          }}>
            {title}
          </Text>
        </ThemedView>
      )}
      renderItem={({ item }) => {
        if (!item || !item.event) {
          return null;
        }

        return (
          <ScheduleEventView
            title={item.event.title || 'Untitled Event'}
            time={item.event.start_time ? format(new Date(item.event.start_time), 'h:mm a') : 'No time'}
            location={item.event.location?.text || undefined}
            userStatus={item.event.userStatus}
            eventOccurrence={item}
          />
        );
      }}
      onScrollToIndexFailed={(info) => {
        console.warn('Scroll to index failed', info);
        // Fallback: try to scroll to a valid section
        const { index, highestMeasuredFrameIndex } = info;
        const targetIndex = Math.min(index, highestMeasuredFrameIndex);
        if (targetIndex >= 0 && targetIndex < sections.length) {
          setTimeout(() => {
            sectionListRef.current?.scrollToLocation({
              sectionIndex: targetIndex,
              itemIndex: 0,
              viewPosition: 0,
              animated: true,
            });
          }, 100);
        }
      }}
      // Performance optimization props for virtualization
      removeClippedSubviews={true}
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={50}
      initialNumToRender={12}
      windowSize={8}
      legacyImplementation={false}
      disableVirtualization={false}
      getItemLayout={(data, index) => {
        // Provide item layout for better scroll performance
        // This helps with virtualization by giving React Native exact measurements
        return {
          length: EVENT_HEIGHT + EVENT_GAP,
          offset: (EVENT_HEIGHT + EVENT_GAP) * index,
          index,
        };
      }}
      ListEmptyComponent={() => (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: tabBarHeight,
          opacity: loading ? 0.5 : 1
        }}>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 18,
            fontWeight: '500',
            textAlign: 'center'
          }}>
            No events scheduled
          </Text>
        </View>
      )}
    />
  );
};

export default React.memo(ScheduleView);