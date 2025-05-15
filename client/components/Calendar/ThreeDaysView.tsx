// components/Calendar/ThreeDayView.tsx
import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, FlatList, Dimensions, ScrollView, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { addDays, startOfWeek } from 'date-fns';
import HourList from './WeekView/HourList';
import WeekdayHeader from './WeekView/WeekdayHeader';
import WeekGrid from './WeekView/WeekGrid';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '../ThemedView';

const HOURS = Array.from({ length: 25 }, (_, i) => i);
const screenWidth = Dimensions.get('window').width;

const buildThreeDayPages = (centerDate: Date) => {
  const offsets = [-3, 0, 3]; // create 3 pages: prev, current, next
  return offsets.map((offset) => {
    const start = addDays(centerDate, offset);
    return Array.from({ length: 3 }, (_, i) => addDays(start, i));
  });
};

interface ThreeDayViewProps {
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
}

const ThreeDayView = forwardRef(({ handleMonthYearChange }: ThreeDayViewProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const hourListRef = useRef<FlatList>(null);
  const pagesListRef = useRef<FlatList>(null);
  const gridListRef = useRef<FlatList>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const tabBarHeight = useBottomTabBarHeight();
  const sharedX = useRef(new Animated.Value(0)).current;
  const dayPages = buildThreeDayPages(selectedDate);

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      // if (fromDropdownRef.current) {
        setSelectedDate(date);
      // }
    }
  }));

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { x } = event.nativeEvent.contentOffset;
    const page = Math.round(x / (screenWidth - 50));
    if (page !== 1) {
      const newDate = addDays(selectedDate, (page - 1) * 3);
      setSelectedDate(newDate);
      handleMonthYearChange(newDate.getMonth(), newDate.getFullYear(), newDate.getDay(), false);
      pagesListRef.current?.scrollToIndex({ index: 1, animated: false });
    }
  };

  return (
    <ScrollView
      style={{ width: screenWidth, paddingBottom: tabBarHeight }}
      contentContainerStyle={{ flexDirection: 'column' }}
      showsVerticalScrollIndicator={false}
      bounces={true}
      stickyHeaderIndices={[0]}
    >
      <View style={{ width: screenWidth, overflow: 'hidden', paddingBottom: 12, backgroundColor: themeColors.background }}>
        <ThemedView style={{ position: 'absolute', top: 0, width: 50, height: 50, zIndex: 999 }} />
        <Animated.View
          style={{
            paddingLeft: 50,
            flexDirection: 'row',
            width: (screenWidth - 50) * dayPages.length,
            transform: [{ translateX: Animated.multiply(sharedX, -1) }],
          }}
        >
          {dayPages.map((daySet, i) => (
            <View key={i} style={{ width: screenWidth - 50 }}>
              <WeekdayHeader weekDates={daySet} themeColors={themeColors} />
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <HourList hours={HOURS} scrollRef={hourListRef} />
        <Animated.FlatList
          ref={pagesListRef}
          data={dayPages}
          horizontal
          pagingEnabled
          initialScrollIndex={1}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => `3day-${i}`}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: sharedX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({
            length: screenWidth - 50,
            offset: (screenWidth - 50) * i,
            index: i,
          })}
          renderItem={({ item: daySet }) => (
            <View style={{ width: screenWidth - 50 }}>
              <WeekGrid
                hours={HOURS}
                weekDates={daySet}
                gridRef={gridListRef}
              />
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
});

export default ThreeDayView;