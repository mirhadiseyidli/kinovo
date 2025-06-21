// components/Calendar/WeekView.tsx
import React, { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, FlatList, Dimensions, ScrollView, Animated as RNAnimated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { addDays, startOfWeek } from 'date-fns';
import HourList from './WeekView/HourList';
import WeekdayHeader from './WeekView/WeekdayHeader';
import WeekGrid from './WeekView/WeekGrid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ThemedView } from '../ThemedView';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useEventContext } from '@/context/UserSessionContext';

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const screenWidth = Dimensions.get('window').width;

const buildWeekPages = (centerDate: Date) => {
  const pages = [-7, 0, 7].map((offset) => {
    const start = addDays(startOfWeek(addDays(centerDate, offset)), 0);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });
  return pages;
};

interface WeekViewProps {
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  fromDropdownRef: React.RefObject<boolean>; // <--- accept the ref itself
}

const WeekView = forwardRef(({ handleMonthYearChange, fromDropdownRef }: WeekViewProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const hourListRef = useRef<FlatList>(null);
  const pagesListRef = useRef<FlatList>(null);
  const gridListRef = useRef<FlatList>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const tabBarHeight = useBottomTabBarHeight();
  const sharedX = React.useRef(new RNAnimated.Value(0)).current;
  const weekPages = buildWeekPages(selectedDate);
  const { fetchEventsForWeek } = useEventContext();

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      if (fromDropdownRef.current) {
        setSelectedDate(date)
      } 
    }
  }));

  useEffect(() => {
    // Fetch events for the current week when the component mounts or date changes
    fetchEventsForWeek(selectedDate);
  }, [selectedDate, fetchEventsForWeek]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { x } = event.nativeEvent.contentOffset;
    const page = Math.round(x / (screenWidth - 50));
    if (page !== 1) {
      const newDate = addDays(selectedDate, (page - 1) * 7);
      setSelectedDate(newDate);
      handleMonthYearChange(newDate.getMonth(), newDate.getFullYear(), newDate.getDay(), false);
      pagesListRef.current?.scrollToIndex({ index: 1, animated: false });
      
      // Fetch events for the new week
      fetchEventsForWeek(newDate);
    }
  };

  return (
    <ScrollView 
      style={{ width: screenWidth }}
      contentContainerStyle={{ flexDirection: 'column', paddingBottom: 8 }}
      showsVerticalScrollIndicator={false}
      bounces={true}
      stickyHeaderHiddenOnScroll={false}
      stickyHeaderIndices={[0]}
    >
      {/* <Animated.View
        key={fromDropdownRef?.current ? selectedDate.toISOString() : 'static-week-key'}
        entering={
          fromDropdownRef?.current 
            ? FadeIn.duration(1000) 
            : undefined
        }
      > */}
        <View style={{ width: screenWidth, overflow: 'hidden', paddingBottom: 12, backgroundColor: themeColors.background }}>
          <ThemedView style={{ position: 'absolute', top: 0, width: 50, height: 50, zIndex: 999 }}/>
          <RNAnimated.View
            style={{
              paddingLeft: 50,
              flexDirection: 'row',
              width: (screenWidth - 50) * weekPages.length,
              transform: [{ translateX: RNAnimated.multiply(sharedX, -1) }],
            }}
          >
            {weekPages.map((weekDates, i) => (
              <View key={i} style={{ width: screenWidth - 50 }}>
                <WeekdayHeader weekDates={weekDates} themeColors={themeColors} />
              </View>
            ))}
          </RNAnimated.View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <HourList hours={HOURS} scrollRef={hourListRef} />
          <RNAnimated.FlatList
            ref={pagesListRef}
            data={weekPages}
            horizontal
            pagingEnabled
            initialScrollIndex={1}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `week-${i}`}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: sharedX } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({
              length: screenWidth - 50,
              offset: (screenWidth - 50) * i,
              index: i,
            })}
            renderItem={({ item: weekDates }) => {
              return (
              <View style={{ width: screenWidth - 50 }}>
                <WeekGrid
                  hours={HOURS}
                  weekDates={weekDates}
                  gridRef={gridListRef}
                />
              </View>
              )
            }}
          />
        </View>
      {/* </Animated.View> */}
    </ScrollView>
  );
});

export default WeekView;