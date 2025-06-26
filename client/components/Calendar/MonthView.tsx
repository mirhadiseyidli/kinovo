import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { FlatList, Dimensions, View, ScrollView } from 'react-native';
import { MonthViewProps, Event, CalendarHeaderMonthViewRefProps } from '@/types/allTypes';
import MonthCalendar from './MonthView/MonthCalendar';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import WeekDayNames from './CalendarHeader/WeekDayNames';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEventContext } from '@/context/UserSessionContext';

// Memoize expensive date calculations
const dateCalculationCache = new Map<string, Array<{year: number, month: number}>>();

const setNewDates = (year: number, month: number) => {
  const cacheKey = `${year}-${month}`;
  
  if (dateCalculationCache.has(cacheKey)) {
    return dateCalculationCache.get(cacheKey)!;
  }

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const result = [prevMonth, { year, month }, nextMonth];
  
  // Cache management - clear if too large
  if (dateCalculationCache.size > 50) {
    dateCalculationCache.clear();
  }
  
  dateCalculationCache.set(cacheKey, result);
  return result;
};

const MonthView = forwardRef<CalendarHeaderMonthViewRefProps, MonthViewProps>(({
  currentDateRef,
  handleMonthYearChange,
  refreshing,
  onFinishRefresh,
  fromDropdownRef
}, ref) => {
  const [dates, setDates] = useState({month: currentDateRef.current.getMonth(), year: currentDateRef.current.getFullYear()});
  // Performance optimization: Memoize screen width to prevent recalculation
  const screenWidth = React.useMemo(() => Dimensions.get('window').width, []);
  const [monthArray, setMonthArray] = useState(() => {
    const month = currentDateRef.current.getMonth();
    const year = currentDateRef.current.getFullYear();
    const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    return [prevMonth, { year, month }, nextMonth];
  });
  const listRef = useRef<FlatList>(null);
  const { fetchEventsForMonth, refreshEvents, loading } = useEventContext();
  const tabBarHeight = useBottomTabBarHeight();
  // Performance optimization: Memoize key calculation
  const key = React.useMemo(() => fromDropdownRef?.current
    ? `month-${currentDateRef.current.getFullYear()}-${currentDateRef.current.getMonth()}`
    : 'static-month-key', [fromDropdownRef?.current, currentDateRef.current?.getTime()]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      setDates({month: date.getMonth(), year: date.getFullYear()});
    },
  }));

  useEffect(() => {
    const fetchEvents = async () => {
      if (refreshing) {
        await refreshEvents(new Date(dates.year, dates.month), 'Month');
      } else {
        await fetchEventsForMonth(dates.month, dates.year);
      }
      onFinishRefresh();
    };

    fetchEvents();
  }, [refreshing, dates.month, dates.year]);

  // Update month array when dates change from external sources (like dropdown)
  useEffect(() => {
    const { month, year } = dates;
    const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    setMonthArray([prevMonth, { year, month }, nextMonth]);
  }, [dates.year, dates.month]);

  const getNextMonth = (year: number, month: number) => {
    return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  };

  const getPrevMonth = (year: number, month: number) => {
    return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  };

  const updateMonthForward = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const lastMonth = monthArray[2];
    const nextMonth = getNextMonth(lastMonth.year, lastMonth.month);
    
    setMonthArray(prev => {
      const [_, ...rest] = prev; // Remove first month
      return [...rest, nextMonth]; // Add next month at the end
    });

    handleMonthYearChange(monthArray[2].month, monthArray[2].year, 1, false);
    setDates({ month: monthArray[2].month, year: monthArray[2].year });
    
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    });
  };

  const updateMonthBackward = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    const firstMonth = monthArray[0];
    const prevMonth = getPrevMonth(firstMonth.year, firstMonth.month);
    
    setMonthArray(prev => {
      const rest = prev.slice(0, -1); // Remove last month
      return [prevMonth, ...rest]; // Add prev month at the start
    });

    handleMonthYearChange(monthArray[0].month, monthArray[0].year, 1, false);
    setDates({ month: monthArray[0].month, year: monthArray[0].year });
    
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    });
  };

  const handleMomentumScrollEnd = ({
    nativeEvent,
  }: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const x = nativeEvent.contentOffset.x;
    const page = Math.round(x / screenWidth);

    if (fromDropdownRef?.current) {
      fromDropdownRef.current = false;
    }

    if (page === 0) {
      updateMonthBackward();
    } else if (page === 2) {
      updateMonthForward();
    }
  };

  return (
    <View style={{ flex: 1, width: screenWidth }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={monthArray}
        keyExtractor={(item) => `${item.year}-${item.month}`}
        renderItem={({ item }) => (
          <ScrollView 
            style={{ width: screenWidth, height: 'auto', paddingBottom: tabBarHeight }}
            showsVerticalScrollIndicator={false}
            stickyHeaderHiddenOnScroll={false}
            stickyHeaderIndices={[0]}
          >
            <WeekDayNames 
              refreshing={refreshing}
            />
            <MonthCalendar
              monthDate={new Date(item.year, item.month, 1)}
              refreshing={refreshing}
              loading={loading}
              handleMonthYearChange={handleMonthYearChange}
            />
          </ScrollView>
        )}
        initialScrollIndex={1}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      />
    </View>
  );
});

export default React.memo(MonthView);