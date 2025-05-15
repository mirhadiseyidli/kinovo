import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, Dimensions } from 'react-native';
import ScheduleEventView from './ScheduleView/ScheduleEventView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';
import { format, isToday, parseISO } from 'date-fns';
import { Event } from '@/types/allTypes';
import { useGetMyEvents } from '@/hooks/useGetMyEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { InteractionManager } from 'react-native';

const groupEventsByDate = (events: Event[]) => {
  return events.reduce((acc, event) => {
    const dateKey = format(new Date(event?.start_time ?? ''), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
};

interface ScheduleViewProps {
  currentDateRef: React.RefObject<Date>;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentDateRef }) => {
  const { fetchMyEvents, loading } = useGetMyEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const selectedDate = currentDateRef.current;
  const height = Dimensions.get('window').height;
  const tabBarHeight = useBottomTabBarHeight();

  const fetchEvents = async () => {
    const events = await fetchMyEvents();
    setEvents(events);
  }
  
  useEffect(() => {
    fetchEvents();
  }, []);

  const grouped = groupEventsByDate(events);

  const sections = Object.entries(grouped).map(([date, data]) => ({
    title: format(parseISO(date), 'EEEE, MMMM d'),
    data,
  }));

  // Constants for calculating section sizes
  const HEADER_HEIGHT = 8 /* paddingTop */ + 16 /* fontSize */ + 12 /* marginBottom */;
  const EVENT_HEIGHT = 86;  // height of each event row
  const EVENT_GAP = 8;      // vertical gap between event rows

  // Calculate total height for each section: header + events + gaps
  const sectionHeights = useMemo(() => {
    return sections.map(section => {
      const eventCount = section.data.length;
      const gapsHeight = eventCount > 1 ? (eventCount - 1) * EVENT_GAP : 0;
      return HEADER_HEIGHT + (eventCount * EVENT_HEIGHT) + gapsHeight;
    });
  }, [sections]);

  const dynamicPadding = useMemo(() => {
    if (!selectedDate) return 0;

    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    const allDates = Object.keys(grouped).sort();
    const selectedIndex = allDates.indexOf(selectedKey);
    if (selectedIndex < 0) return 0;

    // Sum heights of all sections below the selected one
    const followingHeightsSum = sectionHeights
      .slice(selectedIndex + 1)
      .reduce((sum, h) => sum + h, 0);

    // If the remaining content is shorter than the screen, pad to fill
    return followingHeightsSum < height ? (height - followingHeightsSum - tabBarHeight) : 0;
  }, [sectionHeights, selectedDate, grouped, height]);

  const sectionListRef = useRef<SectionList>(null);

  useEffect(() => {
    if (!selectedDate || !sections.length) return;
  
    const selectedKey = format(selectedDate, 'EEEE, MMMM d');
    const sectionIndex = sections.findIndex(section => section.title === selectedKey);
    console.log('Scrolling to section', sectionIndex);
  
    if (sectionIndex >= 0) {
      InteractionManager.runAfterInteractions(() => {
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          viewPosition: 0, // aligns to top
          // viewOffset: 120,
          animated: true,
        });
      });
    }
  }, [sections, selectedDate]);

  return (
    <SectionList
      ref={sectionListRef}
      sections={sections}
      keyExtractor={(item, index) => item.title + index}
      contentContainerStyle={{ 
        // minHeight: height, 
        minHeight: height + dynamicPadding,
        paddingHorizontal: 16, 
        // paddingBottom: tabBarHeight 
        paddingBottom: tabBarHeight + dynamicPadding,
        gap: 8
      }}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({ section: { title } }) => (
        <ThemedView key={`${title}`} style={{ paddingTop: 8 }}>
          <Text style={{ 
            color: '#fff', 
            fontSize: 16, 
            fontWeight: '700', 
            marginBottom: 12, 
          }}>
            {title}
          </Text>
        </ThemedView>
      )}
      renderItem={({ item }) => (
        <ScheduleEventView
          title={item.title}
          time={item.start_time}
          iconName={item.event_picture as any}
          iconColor={item.iconColor}
        />
      )}
      getItemLayout={(data, index) => ({
        length: 86, // estimated height of each item
        offset: 86 * index,
        index,
      })}
      onScrollToIndexFailed={(info) => {
        console.warn('Scroll to index failed', info);
      }}
    />
  );
};

export default React.memo(ScheduleView);