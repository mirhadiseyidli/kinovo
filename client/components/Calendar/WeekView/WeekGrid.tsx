// components/Calendar/WeekGrid.tsx
import React from 'react';
import { FlatList, View, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useCalendarContext } from '@/context/CalendarProvider.v2';
import { format, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

interface WeekGridProps {
  hours: number[];
  weekDates: Date[];
  gridRef: React.RefObject<FlatList<any> | null>;
  loading?: boolean;
  refreshing?: boolean;
}

const WeekGrid: React.FC<WeekGridProps> = ({ hours, weekDates, gridRef, loading, refreshing }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { getOccurrencesForDate, currentDate } = useCalendarContext();
  const router = useRouter();

  // Performance optimization: Cache event positions to prevent recalculation
  const eventPositionCache = React.useRef(new Map<string, { top: number; height: number }>());

  const getEventPosition = React.useCallback((startTime: string, endTime: string) => {
    // Performance optimization: Create cache key for position calculation
    const cacheKey = `${startTime}-${endTime}`;
    
    if (eventPositionCache.current.has(cacheKey)) {
      return eventPositionCache.current.get(cacheKey)!;
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    
    // The layout structure:
    // - HourList has 18px paddingTop
    // - Each grid row is 35px high
    // - Hour labels are positioned in the middle of each row
    // - We want events to align with the hour slots
    
    const HOUR_SLOT_HEIGHT = 35;
    const HOUR_LIST_PADDING_TOP = 18;
    
    // Position events to align with the hour grid
    // The first hour (0) starts right after the padding
    // Add a small offset to center events with the hour labels
    const LABEL_CENTER_OFFSET = 17.5; // Half of 35px to center with labels
    const top = (startHour * HOUR_SLOT_HEIGHT) + HOUR_LIST_PADDING_TOP + LABEL_CENTER_OFFSET;
    const height = Math.max((endHour - startHour) * HOUR_SLOT_HEIGHT, 20);
    
    const result = { top, height };
    
    // Cache management: clear cache if it gets too large
    if (eventPositionCache.current.size > 100) {
      eventPositionCache.current.clear();
    }
    
    eventPositionCache.current.set(cacheKey, result);
    return result;
  }, []);

  const handleEventPress = (occurrence: any) => {
    if (!occurrence?.event) return;

    // For recurring event occurrences, use the originalEventId, otherwise use the regular _id
    const eventId = occurrence.event.originalEventId || occurrence.event._id;
    if (!eventId) return;

    // Prepare navigation parameters
    const params: any = { event_id: eventId };

    // For recurring event occurrences, pass the occurrence date information
    if (occurrence.event.isRecurringOccurrence && occurrence.event.start_time && occurrence.event.end_time) {
      params.occurrence_start = new Date(occurrence.event.start_time).toISOString();
      params.occurrence_end = new Date(occurrence.event.end_time).toISOString();
      params.is_occurrence = 'true';
    }

    router.push({
      pathname: "/(auth)/viewEvent/[event_id]" as const,
      params: params
    });
  };

  // Performance optimization: Memoize style calculations for event status
  const getEventStyles = React.useCallback((userStatus: string) => {
    const styleKey = `${userStatus}-${colorScheme}`;
    
    let backgroundColor = themeColors.mountainGreen;
    let borderColor = themeColors.mountainGreen;
    let borderWidth = 1;
    let opacity = 0.9;
    let textStyle: any = {
      color: 'white',
      fontSize: 9,
      fontWeight: '600',
    };

    if (userStatus === 'rejected') {
      backgroundColor = themeColors.background;
      borderColor = themeColors.border;
      borderWidth = 1;
      opacity = 0.7;
      textStyle = {
        ...textStyle,
        textDecorationLine: 'line-through',
        color: themeColors.text,
      };
    } else if (userStatus === 'maybe') {
      backgroundColor = themeColors.maybeStatusColor + '50';
      borderColor = themeColors.maybeStatusColor;
      borderWidth = 1;
      textStyle = {
        ...textStyle,
        color: themeColors.text,
      };
    } else if (userStatus === 'pending') {
      backgroundColor = themeColors.background;
      borderColor = themeColors.mountainGreen;
      borderWidth = 1;
      textStyle = {
        ...textStyle,
        color: themeColors.text,
      };
    }

    return { backgroundColor, borderColor, borderWidth, opacity, textStyle };
  }, [themeColors, colorScheme]);

  // Calculate overlapping events layout for better UX
  const calculateEventLayout = React.useCallback((dayOccurrences: any[], dayIndex: number) => {
    const dayWidth = (screenWidth - 50) / weekDates.length;
    
    // Sort events by start time
    const sortedEvents = dayOccurrences
      .map((occurrence, index) => ({
        occurrence,
        originalIndex: index,
        ...getEventPosition(occurrence.event.start_time, occurrence.event.end_time)
      }))
      .sort((a, b) => a.top - b.top);

    // Group overlapping events
    const eventGroups: any[][] = [];
    
    sortedEvents.forEach(event => {
      let placed = false;
      
      // Try to place in existing group
      for (const group of eventGroups) {
        const hasOverlap = group.some(groupEvent => 
          !(event.top >= groupEvent.top + groupEvent.height || 
            groupEvent.top >= event.top + event.height)
        );
        
        if (hasOverlap) {
          group.push(event);
          placed = true;
          break;
        }
      }
      
      // Create new group if no overlap found
      if (!placed) {
        eventGroups.push([event]);
      }
    });

    // Calculate layout for each event
    const layouts: any[] = [];
    
    eventGroups.forEach(group => {
      const groupSize = group.length;
      const eventWidth = (dayWidth - 4) / groupSize;
      
      group.forEach((event, index) => {
        layouts[event.originalIndex] = {
          left: dayIndex * dayWidth + 2 + (index * eventWidth),
          top: event.top,
          width: eventWidth - 1, // Small gap between overlapping events
          height: event.height,
          zIndex: 10 + index // Stagger z-index
        };
      });
    });

    return layouts;
  }, [getEventPosition, weekDates.length]);

  const renderEventChip = React.useCallback((occurrence: any, dayIndex: number, eventIndex: number, layout: any) => {
    // Get memoized styles
    const { backgroundColor, borderColor, borderWidth, opacity, textStyle } = getEventStyles(occurrence.event.userStatus);
    
    const isPast = new Date(occurrence.event.end_time) < new Date();

    return (
      <TouchableOpacity
        key={`${occurrence.id}-${eventIndex}`}
        onPress={() => handleEventPress(occurrence)}
        style={{
          position: 'absolute',
          left: layout.left,
          top: layout.top,
          width: layout.width,
          height: layout.height,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: borderWidth,
          borderRadius: 4,
          padding: 2,
          zIndex: layout.zIndex,
          opacity: isPast ? 0.4 : opacity,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{...textStyle, zIndex: 2, position: 'relative', fontSize: layout.width < 40 ? 8 : 9}}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {occurrence.event.title}
        </Text>
      </TouchableOpacity>
    );
  }, [getEventStyles, handleEventPress]);

  // Memoized grid row renderer for better performance
  const renderGridRow = React.useCallback(() => (
    <View style={{ flexDirection: 'row', height: 35 }}>
      {weekDates.map((date, dayIndex) => (
        <View
          key={date.toISOString()}
          style={{
            width: (screenWidth - 50) / weekDates.length,
            borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
            borderColor: themeColors.calendarBorderColor,
          }}
        />
      ))}
    </View>
  ), [weekDates, colorScheme, themeColors.calendarBorderColor]);

  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        ref={gridRef}
        data={hours}
        scrollEventThrottle={16}
        scrollEnabled={false}
        keyExtractor={(hour) => hour.toString()}
        renderItem={renderGridRow}
      />
      
      {/* Event overlay */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: hours.length * 35,
        pointerEvents: 'box-none',
        opacity: loading || refreshing ? 0.5 : 1
      }}>
        {weekDates.map((date, dayIndex) => {
          const dayOccurrences = getOccurrencesForDate(date);
          const layouts = calculateEventLayout(dayOccurrences, dayIndex);
          return dayOccurrences.map((occurrence, eventIndex) => 
            renderEventChip(occurrence, dayIndex, eventIndex, layouts[eventIndex])
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(WeekGrid);