import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { DayCellProps } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useCalendarViewContext } from '@/context/CalendarViewContext';
import { useEventContext } from '@/context/UserSessionContext';

const DayCell = React.memo<DayCellProps>(({ date, month, today, cellWidth, cellHeight, handleMonthYearChange }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { view, setView } = useCalendarViewContext();
  const { getOccurrencesForDate } = useEventContext();
  
  const dayOccurrences = React.useMemo(
    () => getOccurrencesForDate(date),
    [getOccurrencesForDate, date]
  );

  const isCurrentMonth = date.getMonth() === month;
  const isToday = isCurrentMonth && date.toDateString() === today.toDateString();

  const openSchedule = (date: Date) => {
    setView('Schedule');
    handleMonthYearChange(date.getMonth(), date.getFullYear(), date.getDate(), false);
  }
  
  return (
    <TouchableOpacity
      onPress={() => openSchedule(date)}
      style={{
        paddingHorizontal: 2,
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: cellWidth,
        height: cellHeight,
        borderWidth: colorScheme === 'dark' ? 0.2 : 0.25,
        borderColor: themeColors.calendarBorderColor,
      }}
    >
      <View style={{
        width: cellWidth * 0.4,
        height: cellWidth * 0.4,
        borderRadius: (cellWidth * 0.6) / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        backgroundColor: isToday ? themeColors.mountainGreen : undefined,
      }}>
        <Text style={{ color: isToday ? 'white' : themeColors.text, fontSize: 12, opacity: isCurrentMonth ? 1 : 0.5 }}>
          {date.getDate()}
        </Text>
      </View>

      {dayOccurrences.slice(0, 3).map(occurrence => {
        // Determine styling based on user status
        const userStatus = occurrence.event.userStatus;
        let backgroundColor = themeColors.mountainGreen;
        let borderColor = themeColors.mountainGreen;
        let borderWidth = 1;
        let opacity = isCurrentMonth ? 1 : 0.5;
        let textStyle: any = { 
          color: 'white', 
          fontSize: 9, 
          fontWeight: '600' 
        };

        if (userStatus === 'rejected') {
          backgroundColor = themeColors.background;
          borderColor = themeColors.border;
          borderWidth = 1;
          textStyle = {
            ...textStyle,
            color: themeColors.text,
            textDecorationLine: 'line-through',
            opacity: 0.7,
          };
        } else if (userStatus === 'maybe') {
          backgroundColor = themeColors.maybeStatusColor;
          borderColor = themeColors.maybeStatusColor;
          borderWidth = 1;
          textStyle = {
            ...textStyle,
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
          <View
            key={occurrence.id}
            style={{ 
              marginTop: 2, 
              width: '100%', 
              borderRadius: 3, 
              paddingLeft: 4, 
              paddingVertical: 1, 
              justifyContent: 'center', 
              backgroundColor: backgroundColor,
              borderColor: borderColor,
              borderWidth: borderWidth,
              opacity: opacity,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Text
              style={{...textStyle, zIndex: 2, position: 'relative'}}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {occurrence.event.title}
            </Text>
          </View>
        );
      })}

      {dayOccurrences.length > 3 && (
        <View style={{ marginTop: 2, width: '100%', borderRadius: 3, paddingLeft: 4, paddingVertical: 1, justifyContent: 'center', backgroundColor: themeColors.mountainGreen, opacity: isCurrentMonth ? 1 : 0.5 }}>
          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
            +{dayOccurrences.length - 3} more
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default DayCell;