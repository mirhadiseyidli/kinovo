import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FlatList, Dimensions, View, ScrollView } from 'react-native';
import { Event } from '@/types/allTypes';
import MonthCalendar from './MonthView/MonthCalendar';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import WeekDayNames from './CalendarHeader/WeekDayNames';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useCalendarContext } from '@/context/CalendarProvider.v2';

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
  // Use CalendarContext for state management and data
  const { currentDate, setCurrentDate, refreshEvents, loading } = useCalendarContext();
  
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [isTransitioning, setIsTransitioning] = useState(false);

  // Cleanup effect
  useEffect(() => {
    mountedRef.current = true;
    
    // Periodic cache cleanup
    const cacheCleanupInterval = setInterval(() => {
      if (dateCalculationCache.size > 20) {
        dateCalculationCache.clear();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      clearInterval(cacheCleanupInterval);
    };
  }, []);

  useEffect(() => {
    const handleRefresh = async () => {
      if (refreshing) {
        await refreshEvents();
        onFinishRefresh();
      }
    };

    handleRefresh();
  }, [refreshing]); // Only listen for refreshing changes, CalendarProvider.v2 handles data fetching

  // Update month array when currentDate changes from external sources (like dropdown)
  useEffect(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const newArray = setNewDates(year, month); // Use cached calculation
    setMonthArray(newArray);
  }, [currentDate.getTime()]); // Use timestamp for better comparison

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
    setCurrentDate(new Date(lastMonth.year, lastMonth.month, 1));
    
    rafRef.current = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsTransitioning(false);
        }
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
    setCurrentDate(new Date(firstMonth.year, firstMonth.month, 1));
    
    rafRef.current = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsTransitioning(false);
        }
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

  // Memoized render item for better performance
  const MemoizedMonthItem = React.memo(({ 
    item, 
    loading: itemLoading, 
    refreshing: itemRefreshing 
  }: { 
    item: { year: number, month: number },
    loading: boolean,
    refreshing: boolean
  }) => (
    <ScrollView 
      style={{ width: screenWidth, height: 'auto', paddingBottom: tabBarHeight }}
      showsVerticalScrollIndicator={false}
      stickyHeaderHiddenOnScroll={false}
      stickyHeaderIndices={[0]}
      removeClippedSubviews={true} // Enable view recycling for better performance
      maxToRenderPerBatch={10} // Optimize rendering batch size
    >
      <WeekDayNames 
        refreshing={itemRefreshing}
      />
      <MonthCalendar
        monthDate={new Date(item.year, item.month, 1)}
        refreshing={itemRefreshing}
        loading={itemLoading}
      />
    </ScrollView>
  ), (prevProps, nextProps) => {
    return prevProps.item.year === nextProps.item.year && 
           prevProps.item.month === nextProps.item.month &&
           prevProps.loading === nextProps.loading &&
           prevProps.refreshing === nextProps.refreshing;
  });

  const renderItem = React.useCallback(({ item }: { item: { year: number, month: number } }) => (
    <MemoizedMonthItem item={item} loading={loading} refreshing={refreshing} />
  ), [loading, refreshing]);

  return (
    <View style={{ flex: 1, width: screenWidth }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={monthArray}
        keyExtractor={(item) => `${item.year}-${item.month}`}
        renderItem={renderItem}
        initialScrollIndex={1}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3} // Only render 3 months at a time
        windowSize={3} // Keep small window size for better performance
        initialNumToRender={1} // Only render the initial month
        updateCellsBatchingPeriod={100} // Batch updates for better performance
      />
    </View>
  );
};

export default React.memo(MonthView);