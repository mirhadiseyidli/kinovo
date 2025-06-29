import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { getMonth, startOfMonth, startOfWeek, addDays, subMonths, addMonths, format } from 'date-fns';
import { generateMonthGrid } from '../CalendarHeader/utils';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useEventContext } from '@/context/UserSessionContext';
import { Event } from '@/types/allTypes';

const screenWidth = Dimensions.get('window').width;
const CELL_SIZE = screenWidth / 7;
// Total non-grid height: vertical padding (16 top + 16 bottom) + label row marginBottom (6)
const HEADER_HEIGHT = (12 * 2) + 6;
// Cell height smaller than width for a more compact grid
const CELL_HEIGHT = CELL_SIZE * 0.75;

type MonthPageProps = {
  monthDate: Date;
  selectedDate: Date;
};

const EventDots: React.FC<{ count: number }> = ({ count }) => {
  const dots = Math.min(count, 3); // Cap at 3 dots
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
      {Array.from({ length: dots }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: themeColors.mountainGreen,
          }}
        />
      ))}
    </View>
  );
};

const MonthPage: React.FC<MonthPageProps> = ({ monthDate, selectedDate }) => {
  const days = generateMonthGrid(monthDate);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const today = new Date();
  const { getOccurrencesForDateRange } = useEventContext();
  
  // Get events for the entire month at once using the context
  const monthEvents = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = addMonths(monthStart, 1);
    return getOccurrencesForDateRange(monthStart, monthEnd);
  }, [monthDate, getOccurrencesForDateRange]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, number>();
    monthEvents.forEach(occurrence => {
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1);
    });
    return grouped;
  }, [monthEvents]);

  return (
    <View style={{ width: screenWidth }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
          <Text
            key={index}
            style={{
              width: CELL_SIZE,
              textAlign: 'center',
              color: themeColors.text,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 0 }}>
        {days.map((day, i) => {
          const isToday = day && format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const isCurrentMonth = day && day.getMonth() === monthDate.getMonth();
          const eventCount = day ? eventsByDate.get(format(day, 'yyyy-MM-dd')) || 0 : 0;

          return (
            <View
              key={i}
              style={{
                width: CELL_SIZE,
                height: CELL_HEIGHT,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {day && (
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isToday ? '#2bd6b6' : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: isToday ? '#fff' : (isCurrentMonth ? themeColors.text : themeColors.placeholderTextColor),
                        fontSize: 12,
                        fontWeight: isToday ? 'bold' : 'normal',
                      }}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {eventCount > 0 && isCurrentMonth && (
                    <EventDots count={eventCount} />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

type InfiniteCalendarProps = {
  wrapperHeight: number;
  setWrapperHeight: (height: number) => void;
  onMonthYearChange: ((month: number, year: number, day: number, fromDropdown: boolean) => void) | undefined;
  currentDate: Date;
  fromChipRef: React.RefObject<boolean>;
};

const InfiniteCalendar: React.FC<InfiniteCalendarProps> = ({ 
  wrapperHeight, 
  setWrapperHeight, 
  onMonthYearChange, 
  currentDate, 
  fromChipRef 
}) => {
  const listRef = useRef<FlatList>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthData = useMemo(() => [
    subMonths(new Date(year, month), 1),
    new Date(year, month),
    addMonths(new Date(year, month), 1),
  ], [year, month]);

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: 1, animated: false });
  }, [currentDate]);

  const handleScrollEnd = ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number } } }) => {
    fromChipRef.current = false;
    const page = Math.round(nativeEvent.contentOffset.x / screenWidth);
    // Determine the new center month
    let newDate = new Date(currentDate.getFullYear(), currentDate.getMonth());
    if (page === 0) newDate = subMonths(new Date(currentDate.getFullYear(), currentDate.getMonth()), 1);
    if (page === 2) newDate = addMonths(new Date(currentDate.getFullYear(), currentDate.getMonth()), 1);
    // Compute new height for that month
    const days = generateMonthGrid(newDate);
    const rows = days.length / 7;
    const newHeight = rows * CELL_HEIGHT + HEADER_HEIGHT;
    if (wrapperHeight !== newHeight) {
      setWrapperHeight(newHeight);
    }
    // Update centerDate and reset scroll
    onMonthYearChange?.(newDate.getMonth(), newDate.getFullYear(), newDate.getDate(), true);
  };

  return (
    <View style={{ height: wrapperHeight, overflow: 'hidden' }}>
      <FlatList
        ref={listRef}
        data={monthData}
        horizontal
        pagingEnabled
        initialScrollIndex={1}
        keyExtractor={(item) => item.toString()}
        onMomentumScrollEnd={handleScrollEnd}
        showsHorizontalScrollIndicator={false}
        disableVirtualization={true} 
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        renderItem={({ item }) => (
            <MonthPage monthDate={item} selectedDate={currentDate} />
        )}
      />
    </View>
  );
};

export default InfiniteCalendar;
