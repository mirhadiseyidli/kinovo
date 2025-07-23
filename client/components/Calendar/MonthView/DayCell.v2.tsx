import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { ThemedText } from '../../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { format, isToday } from 'date-fns';
import { useCalendarContext } from '@/context/CalendarProvider.v2';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useCalendarContext as useOldCalendarContext } from '@/context/CalendarContext';

/**
 * DayCell.v2 - TanStack Query-based Day Cell
 * 
 * This component replaces the original DayCell with TanStack Query integration.
 * It provides:
 * - Event occurrences from CalendarProvider.v2
 * - Optimized rendering with memoization
 * - Backward compatibility with existing UI
 */

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
  
  // Use new CalendarProvider.v2 for occurrences
  const { getOccurrencesForDate } = useCalendarContext();
  
  // Keep existing context for navigation (backward compatibility)
  const { setView } = useCalendarViewContext();
  const { navigateToDay } = useOldCalendarContext();
  
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
          backgroundColor: themeColors.maybeStatusColor + '50',
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
        width: cellWidth,
        height: cellHeight,
        padding: 2,
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
      activeOpacity={0.7}
    >
      {/* Date number */}
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isCurrentDay ? themeColors.mountainGreen : 'transparent',
        marginBottom: 2,
      }}>
        <ThemedText style={{
          fontSize: 12,
          fontWeight: isCurrentDay ? '600' : '400',
          color: isCurrentDay ? 'white' : (isCurrentMonth ? themeColors.text : themeColors.placeholder),
          opacity: isCurrentMonth ? 1 : 0.5,
        }}>
          {date.getDate()}
        </ThemedText>
      </View>

      {/* Event indicators */}
      <View style={{
        flex: 1,
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}>
        {dayOccurrences.map((occurrence, index) => {
          const eventStyle = getEventStyle(occurrence.event.status);
          const eventTitle = occurrence.event.title || 'Untitled Event';
          
          return (
            <View
              key={occurrence.id}
              style={{
                width: '90%',
                height: 12,
                borderRadius: 6,
                backgroundColor: eventStyle.backgroundColor,
                borderWidth: 0.5,
                borderColor: eventStyle.borderColor,
                marginBottom: 1,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: eventStyle.opacity || 1,
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '500',
                  color: eventStyle.color,
                  textAlign: 'center',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {eventTitle}
              </Text>
            </View>
          );
        })}

        {/* Show "more" indicator if there are additional events */}
        {totalEvents > MAX_VISIBLE_EVENTS && (
          <View style={{
            width: '90%',
            height: 10,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 1,
          }}>
            <Text style={{
              fontSize: 7,
              color: themeColors.placeholder,
              fontWeight: '500',
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