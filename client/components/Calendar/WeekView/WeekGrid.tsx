// components/Calendar/WeekGrid.tsx
import React from 'react';
import { FlatList, View, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useEventContext } from '@/context/UserSessionContext';
import { format, isSameDay } from 'date-fns';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

interface WeekGridProps {
  hours: number[];
  weekDates: Date[];
  gridRef: React.RefObject<FlatList<any> | null>;
}

const WeekGrid: React.FC<WeekGridProps> = ({ hours, weekDates, gridRef }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { getOccurrencesForDate } = useEventContext();
  const router = useRouter();

  const getEventPosition = (startTime: string, endTime: string) => {
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
    

    
    return { top, height };
  };

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
      pathname: "/(auth)/(viewEvent)/[event_id]" as const,
      params: params
    });
  };

  const renderEventChip = (occurrence: any, dayIndex: number, eventIndex: number) => {
    const { top, height } = getEventPosition(occurrence.event.start_time, occurrence.event.end_time);
    const dayWidth = (screenWidth - 50) / weekDates.length;
    
    // Determine styling based on user status
    const userStatus = occurrence.event.userStatus;
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
      backgroundColor = themeColors.maybeStatusColor;
      borderColor = themeColors.maybeStatusColor;
      borderWidth = 1;
      textStyle = {
        ...textStyle,
        color: 'white',
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
    
    return (
      <TouchableOpacity
        key={`${occurrence.id}-${eventIndex}`}
        onPress={() => handleEventPress(occurrence)}
        style={{
          position: 'absolute',
          left: dayIndex * dayWidth + 2,
          top: top,
          width: dayWidth - 4,
          height: height,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: borderWidth,
          borderRadius: 4,
          padding: 4,
          zIndex: 10,
          opacity: opacity,
          overflow: 'hidden',
        }}
      >
        <Text
          style={{...textStyle, zIndex: 2, position: 'relative'}}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {occurrence.event.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        ref={gridRef}
        data={hours}
        scrollEventThrottle={16}
        scrollEnabled={false}
        keyExtractor={(hour) => hour.toString()}
        renderItem={() => (
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
        )}
      />
      
      {/* Event overlay */}
      <View style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: hours.length * 35,
        pointerEvents: 'box-none'
      }}>
        {weekDates.map((date, dayIndex) => {
          const dayOccurrences = getOccurrencesForDate(date);
          return dayOccurrences.map((occurrence, eventIndex) => 
            renderEventChip(occurrence, dayIndex, eventIndex)
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(WeekGrid);