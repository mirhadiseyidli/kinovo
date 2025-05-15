import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { doesEventOccurOnDay } from '../CalendarUtils';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { DayCellProps } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useCalendarViewContext } from '@/context/CalendarViewContext';

const DayCell = React.memo<DayCellProps>(({ date, month, today, cellWidth, cellHeight, eventsData, handleMonthYearChange }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { view, setView } = useCalendarViewContext();
  
  const dayEvents = React.useMemo(
    () => eventsData?.filter(evt => doesEventOccurOnDay(date, evt)) ?? [],
    [eventsData, date]
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
        <Text style={{ color: themeColors.text, fontSize: 12, opacity: isCurrentMonth ? 1 : 0.5 }}>
          {date.getDate()}
        </Text>
      </View>

      {dayEvents.slice(0, 3).map(evt => (
        <View
          key={evt._id}
          style={{ marginTop: 2, width: '100%', borderRadius: 3, paddingLeft: 4, paddingVertical: 1, justifyContent: 'center', backgroundColor: themeColors.mountainGreen, opacity: isCurrentMonth ? 1 : 0.5 }}
        >
          <Text
            style={{ color: themeColors.text, fontSize: 10, fontWeight: '600' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {evt.title}
          </Text>
        </View>
      ))}

      {dayEvents.length > 3 && (
        <View style={{ marginTop: 2, width: '100%', borderRadius: 3, paddingLeft: 4, paddingVertical: 1, justifyContent: 'center', backgroundColor: themeColors.mountainGreen }}>
          <Text style={{ color: themeColors.text, fontSize: 10, fontWeight: '600' }}>
            +{dayEvents.length - 3} more
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default DayCell;