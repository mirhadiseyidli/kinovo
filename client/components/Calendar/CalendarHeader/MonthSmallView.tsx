import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { getMonth, startOfMonth, startOfWeek, addDays, subMonths, addMonths, format } from 'date-fns';
import { generateMonthGrid } from '../CalendarHeader/utils';
import { CalendarHeaderMonthViewRefProps } from '@/types/allTypes';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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

const MonthPage: React.FC<MonthPageProps> = ({ monthDate, selectedDate }) => {
  const days = generateMonthGrid(monthDate);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

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
          const isSelected = day && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
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
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isSelected ? '#2bd6b6' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? '#fff' : themeColors.text,
                      fontSize: 12,
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                  >
                    {day.getDate()}
                  </Text>
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
  currentDateRef: React.RefObject<Date>;
  fromDropdownRef: React.RefObject<boolean>;
  fromChipRef: React.RefObject<boolean>;
};

const InfiniteCalendar: React.FC<InfiniteCalendarProps> = ({ wrapperHeight, setWrapperHeight, onMonthYearChange, currentDateRef, fromDropdownRef, fromChipRef }) => {
  const listRef = useRef<FlatList>(null);

  const year  = currentDateRef.current.getFullYear();
  const month = currentDateRef.current.getMonth();
  const monthData = useMemo(() => [
    subMonths(new Date(year, month), 1),
    new Date(year, month),
    addMonths(new Date(year, month), 1),
  ], [year, month]);

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: 1, animated: false });
  }, [currentDateRef.current]);

  const handleScrollEnd = ({ nativeEvent }: { nativeEvent: { contentOffset: { x: number } } }) => {
    fromChipRef.current = false;
    const page = Math.round(nativeEvent.contentOffset.x / screenWidth);
    // Determine the new center month
    let newDate = new Date(currentDateRef.current.getFullYear(), currentDateRef.current.getMonth());;
    if (page === 0) newDate = subMonths(new Date(currentDateRef.current.getFullYear(), currentDateRef.current.getMonth()), 1);
    if (page === 2) newDate = addMonths(new Date(currentDateRef.current.getFullYear(), currentDateRef.current.getMonth()), 1);
    // Compute new height for that month
    const days = generateMonthGrid(newDate);
    const rows = days.length / 7;
    const newHeight = rows * CELL_HEIGHT + HEADER_HEIGHT;
    if (wrapperHeight !== newHeight) {
      setWrapperHeight(newHeight);
    }
    // Update centerDate and reset scroll
    onMonthYearChange?.(newDate.getMonth(), newDate.getFullYear(), newDate.getDate(), true);
    currentDateRef.current = new Date(currentDateRef.current.getFullYear(), currentDateRef.current.getMonth(), currentDateRef.current.getDate());
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
            <MonthPage monthDate={item} selectedDate={new Date()} />
        )}
      />
    </View>
  );
};

export default InfiniteCalendar;
