import React, { useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';
import { MonthCalendarProps } from '@/types/allTypes';
import { getMonthDays } from '../CalendarUtils';
import DayCell from './DayCell';
import StaticGrid from './StaticGrid';

const MemoizedDayCell = React.memo(DayCell);

interface MonthCalendarComponentProps {
  monthDate: Date;
  refreshing: boolean;
  loading: boolean;
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
}

const MonthCalendar: React.FC<MonthCalendarComponentProps> = ({ monthDate, refreshing, loading, handleMonthYearChange }) => {
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

  return (
    <ThemedView style={{ width: '100%', height: cellHeight * 6 }}>
      {/* Static Grid */}
      <StaticGrid cellWidth={cellWidth} cellHeight={cellHeight} />
      
      {/* Loading Indicator */}
      {(loading || refreshing) && (
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2
        }}>
          <ReanimatedShimmerLine />
        </View>
      )}
      
      {/* Days Overlay */}
      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
        {weeks.map((week, rowIndex) => (
          <View key={rowIndex} style={{ 
            flexDirection: 'row', 
            position: 'absolute', 
            top: rowIndex * cellHeight, 
            left: 0, 
            right: 0,
            opacity: loading ? 0.5 : 1
          }}>
            {week.map((date, idx) => {
              const dateKey = date.toISOString().split('T')[0];
              return (
                <View key={`${dateKey}-${idx}`} style={{ width: cellWidth, height: cellHeight }}>
                  <MemoizedDayCell
                    date={date}
                    month={month}
                    today={today}
                    cellWidth={cellWidth}
                    cellHeight={cellHeight}
                    handleMonthYearChange={(day) => handleMonthYearChange(month, year, day, true)}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ThemedView>
  );
};

export default React.memo(MonthCalendar);