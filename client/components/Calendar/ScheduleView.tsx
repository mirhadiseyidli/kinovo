import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, Dimensions, ActivityIndicator } from 'react-native';
import ScheduleEventView from './ScheduleView/ScheduleEventView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { format, isToday, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Event } from '@/types/allTypes';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { InteractionManager } from 'react-native';
import { useEventContext } from '@/context/EventContext';
import { EventOccurrence } from '@/utils/eventUtils';

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
  currentDateRef: React.RefObject<Date>;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentDateRef }) => {
  const { eventOccurrences, fetchEventsForDateRange, loading } = useEventContext();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const [selectedDate, setSelectedDate] = useState<Date>(currentDateRef.current || new Date());
  const [currentDateString, setCurrentDateString] = useState<string>(
    format(currentDateRef.current || new Date(), 'yyyy-MM-dd')
  );
  const height = Dimensions.get('window').height;
  const tabBarHeight = useBottomTabBarHeight();

  // Update selectedDate when currentDateRef changes (from month view clicks)
  useEffect(() => {
    if (currentDateRef.current) {
      const newDate = new Date(currentDateRef.current);
      const newDateString = format(newDate, 'yyyy-MM-dd');
      
      if (newDateString !== currentDateString) {
        setSelectedDate(newDate);
        setCurrentDateString(newDateString);
      }
    }
  }, [currentDateRef.current?.getTime(), currentDateString]); // Use both getTime and current string

  // Additional monitoring of currentDateRef changes
  useEffect(() => {
    const checkDateRef = () => {
      if (currentDateRef.current) {
        const currentRefString = format(currentDateRef.current, 'yyyy-MM-dd');
        if (currentRefString !== currentDateString) {
          const newDate = new Date(currentDateRef.current);
          setSelectedDate(newDate);
          setCurrentDateString(currentRefString);
        }
      }
    };

    const interval = setInterval(checkDateRef, 100); // Check every 100ms
    return () => clearInterval(interval);
  }, [currentDateString]);

  useEffect(() => {
    // Fetch events for a broader range - from current month to 6 months ahead
    const fetchScheduleEvents = async () => {
      const now = new Date();
      const startDate = startOfMonth(now);
      const endDate = endOfMonth(addMonths(now, 6)); // 6 months ahead
      
      await fetchEventsForDateRange(startDate, endDate);
    };

    fetchScheduleEvents();
  }, [fetchEventsForDateRange]);

  const grouped = useMemo(() => {
    const result = groupOccurrencesByDate(eventOccurrences);
    
    // Filter to show events from a reasonable range
    // Include selected date and a few days before it, plus all future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    // Start from either 3 days before selected date or today, whichever is earlier
    const threeDaysBeforeSelected = new Date(selectedDateOnly);
    threeDaysBeforeSelected.setDate(threeDaysBeforeSelected.getDate() - 3);
    
    const startDate = threeDaysBeforeSelected < today ? threeDaysBeforeSelected : today;
    
    const filteredResult: Record<string, EventOccurrence[]> = {};
    Object.entries(result).forEach(([dateKey, occurrences]) => {
      const eventDate = parseISO(dateKey);
      if (eventDate >= startDate) {
        filteredResult[dateKey] = occurrences;
      }
    });
    
    return filteredResult;
  }, [eventOccurrences, selectedDate]);

  const sections = useMemo(() => {
    if (!grouped || Object.keys(grouped).length === 0) {
      return [];
    }

    const processedSections = Object.entries(grouped)
      .map(([date, data]) => {
        if (!data || !Array.isArray(data)) {
          return null;
        }
        
        try {
          // Parse the date key (yyyy-MM-dd format) to create proper Date object
          const parsedDate = parseISO(date);
          
          return {
            title: format(parsedDate, 'EEEE, MMMM d'),
            date: parsedDate, // Keep the actual date for sorting
            key: date, // Use yyyy-MM-dd as unique key for scrolling
            data: data.sort((a, b) => {
              // Sort events by start time within each day
              const timeA = a.event.start_time ? new Date(a.event.start_time).getTime() : 0;
              const timeB = b.event.start_time ? new Date(b.event.start_time).getTime() : 0;
              return timeA - timeB;
            }),
          };
        } catch (error) {
          console.error('Error formatting date:', date, error);
          return null;
        }
      })
      .filter((section): section is { title: string; date: Date; key: string; data: EventOccurrence[] } => section !== null)
      .sort((a, b) => {
        // Sort sections by actual date (chronological order)
        return a.date.getTime() - b.date.getTime();
      })
      .map(section => ({
        // Keep the key for scrolling, remove the date property after sorting
        title: section.title,
        key: section.key,
        data: section.data
      }));

    return processedSections;
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

  const sectionListRef = useRef<SectionList>(null);

  // Scroll to selected date ONLY when sections change AND we have a valid target
  useEffect(() => {
    if (!sections.length) return;
  
    const targetKey = format(selectedDate, 'yyyy-MM-dd');
    const sectionIndex = sections.findIndex(section => section.key === targetKey);
    
    if (sectionIndex >= 0) {
      // Found exact match - scroll to it
      
      setTimeout(() => {
        // Double-check the section index right before scrolling
        const currentSections = sections;
        const currentIndex = currentSections.findIndex(section => section.key === targetKey);
        
        if (currentIndex >= 0 && currentIndex < currentSections.length) {
          // Calculate manual offset to the target section
          let offset = 0;
          for (let i = 0; i < currentIndex; i++) {
            offset += sectionHeights[i] || 0;
          }
          
          // Use scrollToOffset for more precise control
          const flatListRef = (sectionListRef.current as any)?._listRef;
          if (flatListRef) {
            flatListRef.scrollToOffset({
              offset: offset,
              animated: true,
            });
          } else {
            sectionListRef.current?.scrollToLocation({
              sectionIndex: currentIndex,
              itemIndex: 0,
              viewPosition: 0,
              viewOffset: 0,
              animated: true,
            });
          }
        }
      }, 800); // Even longer delay to ensure stability
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
        setTimeout(() => {
          const currentSections = sections;
          if (closestIndex < currentSections.length) {
            // Calculate manual offset to the target section
            let offset = 0;
            for (let i = 0; i < closestIndex; i++) {
              offset += sectionHeights[i] || 0;
            }
            
            // Use scrollToOffset for more precise control
            const flatListRef = (sectionListRef.current as any)?._listRef;
            if (flatListRef) {
              flatListRef.scrollToOffset({
                offset: offset,
                animated: true,
              });
            } else {
              sectionListRef.current?.scrollToLocation({
                sectionIndex: closestIndex,
                itemIndex: 0,
                viewPosition: 0,
                viewOffset: 0,
                animated: true,
              });
            }
          }
        }, 800);
      }
    }
  }, [sections, format(selectedDate, 'yyyy-MM-dd')]); // Depend on both sections and selected date

  // Show loading state
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingBottom: tabBarHeight 
      }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          marginTop: 16 
        }}>
          Loading events...
        </Text>
      </View>
    );
  }

  // Show empty state
  if (sections.length === 0) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: tabBarHeight 
      }}>
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          fontSize: 18,
          fontWeight: '500',
          textAlign: 'center'
        }}>
          No events scheduled
        </Text>
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          fontSize: 14,
          marginTop: 8,
          textAlign: 'center'
        }}>
          Create an event to get started
        </Text>
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
    />
  );
};

export default React.memo(ScheduleView);