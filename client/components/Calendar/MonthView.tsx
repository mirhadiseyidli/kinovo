import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { FlatList, Dimensions, View, ScrollView } from 'react-native';
import { MonthViewProps, Event, CalendarHeaderMonthViewRefProps } from '@/types/allTypes';
import MonthCalendar from './MonthView/MonthCalendar';
import { format } from 'date-fns';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import WeekDayNames from './CalendarHeader/WeekDayNames';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEventContext } from '@/context/EventContext';

const setNewDates = (year: number, month: number) => {
  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  return [prevMonth, { year, month }, nextMonth];
};

const MonthView = forwardRef<CalendarHeaderMonthViewRefProps, MonthViewProps>(({
  currentDateRef,
  handleMonthYearChange,
  refreshing,
  onFinishRefresh,
  fromDropdownRef
}, ref) => {
  const [dates, setDates] = useState({month: currentDateRef.current.getMonth(), year: currentDateRef.current.getFullYear()});
  const screenWidth = Dimensions.get('window').width;
  const monthKeys = setNewDates(dates.year, dates.month);
  const listRef = useRef<FlatList>(null);
  const { fetchEventsForMonth, refreshEvents, loading } = useEventContext();
  const tabBarHeight = useBottomTabBarHeight();
  const key = fromDropdownRef?.current
    ? `month-${currentDateRef.current.getFullYear()}-${currentDateRef.current.getMonth()}`
    : 'static-month-key';

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      setDates({month: date.getMonth(), year: date.getFullYear()});
    },
  }));

  useEffect(() => {
    const fetchEvents = async () => {
      if (refreshing) {
        await refreshEvents();
      } else {
        await fetchEventsForMonth(dates.month, dates.year);
      }
      onFinishRefresh();
    };

    fetchEvents();
  }, [refreshing, dates.month, dates.year]);

  const prependMonth = () => {
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
    }, 0);
  };

  const appendMonth = () => {
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: 1, animated: false });
    }, 0);
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
      const { year: newYear, month: newMonth } = monthKeys[0];
      handleMonthYearChange(newMonth, newYear, 1, false);
      prependMonth();
    } else if (page === 2) {
      const { year: newYear, month: newMonth } = monthKeys[monthKeys.length - 1];
      handleMonthYearChange(newMonth, newYear, 1, false);
      appendMonth();
    }
  };

  return (
    <View style={{ flex: 1, width: screenWidth }}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={monthKeys}
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
      />
    </View>
  );
});

export default MonthView;