import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { ThemedText } from '../../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format, isToday } from 'date-fns';
import { useEventContext } from '@/context/UserSessionContext';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useCalendarContext } from '@/context/CalendarContext';

interface DayCellProps {
  date: Date;
  month: number;
  today: Date;
  cellWidth: number;
  cellHeight: number;
}

const MAX_VISIBLE_EVENTS = 3;

const DayCell: React.FC<DayCellProps> = ({
  date,
  month,
  today,
  cellWidth,
  cellHeight,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { getOccurrencesForDate } = useEventContext();
  const { setView } = useCalendarViewContext();
  const { navigateToDay } = useCalendarContext();
  
  const isCurrentMonth = date.getMonth() === month;
  const isCurrentDay = isToday(date);
  
  const dayOccurrences = useMemo(() => {
    const occurrences = getOccurrencesForDate(date);
    return occurrences.slice(0, MAX_VISIBLE_EVENTS);
  }, [date, getOccurrencesForDate]);

  const totalEvents = getOccurrencesForDate(date).length;

  const getEventStyle = (status?: string) => {
    switch (status) {
      case 'rejected':
        return {
          backgroundColor: themeColors.background,
          borderColor: themeColors.border,
          color: themeColors.text,
          textDecoration: 'line-through',
          opacity: 0.7
        };
      case 'maybe':
        return {
          backgroundColor: themeColors.maybeStatusColor,
          borderColor: themeColors.maybeStatusColor,
          color: 'white'
        };
      case 'pending':
        return {
          backgroundColor: themeColors.background,
          borderColor: themeColors.mountainGreen,
          color: themeColors.text
        };
      default:
        return {
          backgroundColor: themeColors.mountainGreen,
          borderColor: themeColors.mountainGreen,
          color: 'white'
        };
    }
  };

  const openSchedule = () => {
    setView('Schedule', 'day_cell');
    navigateToDay(date);
  };

  return (
    <TouchableOpacity
      onPress={openSchedule}
      style={{
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 4,
        opacity: isCurrentMonth ? 1 : 0.5,
      }}
    >
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: isCurrentDay ? themeColors.mountainGreen : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
      }}>
        <ThemedText
          style={{
            color: !isCurrentMonth 
              ? themeColors.placeholderTextColor 
              : isCurrentDay 
                ? themeColors.text 
                : themeColors.text,
            fontSize: 12,
            fontWeight: isCurrentDay ? 'bold' : 'normal',
          }}
        >
          {format(date, 'd')}
        </ThemedText>
      </View>
      
      <View style={{ width: '100%', paddingHorizontal: 2 }}>
        {dayOccurrences.map((occurrence, index) => {
          const eventStyle = getEventStyle(occurrence.event.userStatus);
          const isPast = new Date(occurrence.event.end_time!) < new Date();
          
          return (
            <View
              key={occurrence.id}
              style={{
                width: '100%',
                height: 14,
                borderRadius: 3,
                marginBottom: 1,
                paddingHorizontal: 4,
                backgroundColor: eventStyle.backgroundColor,
                borderColor: eventStyle.borderColor,
                borderWidth: 1,
                justifyContent: 'center',
                opacity: isPast ? 0.5 : 1,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 9,
                  color: eventStyle.color,
                  textDecorationLine: eventStyle.textDecoration as any,
                  fontWeight: '600',
                }}
              >
                {occurrence.event.title}
              </Text>
            </View>
          );
        })}
        
        {totalEvents > MAX_VISIBLE_EVENTS && (
          <View style={{
            width: '100%',
            height: 14,
            borderRadius: 3,
            backgroundColor: themeColors.mountainGreen,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 9,
              color: 'white',
              fontWeight: '600',
            }}>
              +{totalEvents - MAX_VISIBLE_EVENTS} more
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(DayCell);