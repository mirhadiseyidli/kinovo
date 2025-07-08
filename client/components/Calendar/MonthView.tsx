import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FlatList, Dimensions, View, ScrollView } from 'react-native';
import { Event } from '@/types/allTypes';
import MonthCalendar from './MonthView/MonthCalendar';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import WeekDayNames from './CalendarHeader/WeekDayNames';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEventContext } from '@/context/UserSessionContext';
import { useCalendarContext } from '@/context/CalendarContext';

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

interface MonthViewComponentProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const MonthView: React.FC<MonthViewComponentProps> = ({
  refreshing,
  onFinishRefresh,
}) => {
  // Use CalendarContext for state management
  const { currentDate, navigateToMonth } = useCalendarContext();
  const { fetchEventsForMonth, refreshEvents, loading } = useEventContext();
  
  // Performance optimization: Memoize screen width to prevent recalculation
  const screenWidth = React.useMemo(() => Dimensions.get('window').width, []);
  const [monthArray, setMonthArray] = useState(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    return [prevMonth, { year, month }, nextMonth];
  });
  const listRef = useRef<FlatList>(null);
  const tabBarHeight = useBottomTabBarHeight();

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      if (refreshing) {
        await refreshEvents(currentDate, 'Month');
      } else {
        await fetchEventsForMonth(currentDate.getMonth(), currentDate.getFullYear());
      }
      onFinishRefresh();
    };

    fetchEvents();
  }, [refreshing, currentDate]); // Removed function dependencies to prevent multiple fetches

  // Update month array when currentDate changes from external sources (like dropdown)
  useEffect(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
    const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
    setMonthArray([prevMonth, { year, month }, nextMonth]);
  }, [currentDate]);

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

    // Navigate to the middle month of the new array (which was the last month of the old array)
    navigateToMonth(lastMonth.month, lastMonth.year);
    
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

    // Navigate to the middle month of the new array (which was the first month of the old array)
    navigateToMonth(firstMonth.month, firstMonth.year);
    
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
};

export default React.memo(MonthView);