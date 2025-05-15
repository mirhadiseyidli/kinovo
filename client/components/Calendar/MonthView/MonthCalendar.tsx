import React, { useMemo } from 'react';
import { Dimensions, View, useWindowDimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '../../ThemedText';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ReanimatedShimmerLine from '../../CustomLoadingIndicatingLine';
import { Event, MonthCalendarProps } from '@/types/allTypes';
import { getMonthDays } from '../CalendarUtils';
import DayCell from './DayCell';

const MemoizedDayCell = React.memo(DayCell);

const MonthCalendar: React.FC<MonthCalendarProps> = ({ monthDate, refreshing, loading, eventsData, handleMonthYearChange }) => {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const calendarDays = getMonthDays(year, month);
  const today = new Date();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const width = Dimensions.get('window').width;
  const cellWidth = Math.floor(width / 7);
  const cellHeight = Math.floor(width / 4);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const eventsByDate = useMemo(() => {
    return (eventsData || []).reduce((acc: Record<string, Event[]>, ev) => {
      // Skip events without a start_time
      if (!ev.start_time) return acc;
      // start_time is a Date when not null
      const dateObj = typeof ev.start_time === 'string' ? new Date(ev.start_time) : ev.start_time;
      const key = dateObj.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    }, {});
  }, [eventsData]);

  return (
    <ThemedView style={{ width: '100%' }}>
      <ThemedView style={{ flexDirection: 'column', width: '100%' }}>
        {weeks.map((week, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row' }}>
            {week.map((date, idx) => {
              const dateKey = date.toISOString().split('T')[0];
              const todaysEvents = eventsByDate[dateKey] || [];
              return (
                <MemoizedDayCell
                  key={`${dateKey}-${idx}`}
                  date={date}
                  month={month}
                  today={today}
                  cellWidth={cellWidth}
                  cellHeight={cellHeight}
                  eventsData={todaysEvents}
                  handleMonthYearChange={handleMonthYearChange}
                />
              );
            })}
          </View>
        ))}
      </ThemedView>
    </ThemedView>
  );
};

export default MonthCalendar;