import { StyleSheet, Text, RefreshControl, StatusBar, View, Dimensions, ScrollView, InteractionManager } from 'react-native';
import React, { useCallback, useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import CalendarHeader from '@/components/Calendar/CalendarHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import Dropdown from '@/components/PickerCustom';
// import MonthView from '@/components/Calendar/MonthView'; // Lazy loaded below
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft, SlideInRight, SlideOutRight, runOnJS, LinearTransition, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { MonthToggleRef } from '@/types/allTypes';
import { CalendarViewProvider, useCalendarViewContext } from '@/context/CalendarViewContext';
import WeekView from '@/components/Calendar/WeekView';
import ScheduleView from '@/components/Calendar/ScheduleView';
import MonthView from '@/components/Calendar/MonthView';

// Lazy load calendar view components for better performance
const LazyWeekView = React.memo(WeekView);
const LazyScheduleView = React.memo(ScheduleView);
const LazyMonthView = React.memo(MonthView);

export interface WeekViewRef {
  currentDate: Date;
  update: (date: Date) => void;
}

function RenderedCalendarView({
  screenWidth,
  monthViewRef,
  weekViewRef,
  currentDateRef,
  handleMonthYearChange,
  refreshing,
  onFinishFetching,
  animateMonthRef,
}: {
  screenWidth: number;
  monthViewRef: React.RefObject<any>;
  weekViewRef: React.RefObject<any>;
  currentDateRef: React.RefObject<Date>;
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  refreshing: boolean;
  onFinishFetching: () => void;
  animateMonthRef: React.RefObject<boolean>;
}) {
  const { view, setView } = useCalendarViewContext();

  return (
    <View style={{ flex: 1 }}>
      {view.toLowerCase() === 'month' ? (
        <LazyMonthView
          ref={monthViewRef}
          currentDateRef={currentDateRef}
          handleMonthYearChange={handleMonthYearChange}
          fromDropdownRef={animateMonthRef}
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      ) : view.toLowerCase() === 'week' ? (
        <WeekView
          ref={weekViewRef}
          handleMonthYearChange={handleMonthYearChange}
          fromDropdownRef={animateMonthRef}
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      ) : (
        <ScheduleView
          currentDateRef={currentDateRef}
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      )}
    </View>
  );
}

export default function Calendar() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const screenWidth = Dimensions.get('window').width
  const [refreshing, setRefreshing] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const currentDateRef = useRef(new Date());
  const monthToggleRef = useRef<MonthToggleRef>({
    currentDate: new Date(),
    update(date: Date) {
      this.currentDate = date;
    },
  });
  const monthViewRef = useRef<MonthToggleRef>({
    currentDate: new Date(),
    update(date: Date) {
      this.currentDate = date;
    },
  });
  const weekViewRef = useRef<WeekViewRef>({
    currentDate: new Date(),
    update(date: Date) {
      this.currentDate = date;
    },
  });
  const animateMonthRef = useRef(true);
  const MemoizedCalendarHeader = React.memo(CalendarHeader);

  // Stabilize layout on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleMonthYearChange = useCallback((month: number, year: number, day: number, fromDropdown: boolean) => {
    animateMonthRef.current = fromDropdown;
    monthToggleRef.current?.update(new Date(year, month, day));
    monthViewRef.current?.update(new Date(year, month, day));
    weekViewRef.current?.update(new Date(year, month, day));
    currentDateRef.current = new Date(year, month, day);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const onFinishFetching = () => {
    setRefreshing(false);
  };

  return (
    <ThemedView
      style={{ 
        flex: 1, 
        paddingTop: insets.top, 
        paddingBottom: tabBarHeight,
        minHeight: 600 // Ensure minimum height to prevent jumping
      }}
    >
      {isLayoutReady && (
        <>
          <MemoizedCalendarHeader
            ref={monthToggleRef}
            currentDateRef={currentDateRef}
            onMonthYearChange={handleMonthYearChange}
            refreshing={refreshing}
            fromDropdownRef={animateMonthRef}
            onRefresh={onRefresh}
          />
          <RenderedCalendarView
            screenWidth={screenWidth}
            monthViewRef={monthViewRef}
            weekViewRef={weekViewRef}
            currentDateRef={currentDateRef}
            handleMonthYearChange={handleMonthYearChange}
            refreshing={refreshing}
            onFinishFetching={onFinishFetching}
            animateMonthRef={animateMonthRef}
          />
        </>
      )}
    </ThemedView>
  );
};
