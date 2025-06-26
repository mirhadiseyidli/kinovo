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
import Animated, { FadeIn, FadeOut, useSharedValue } from 'react-native-reanimated';
import { useEventContext } from '@/context/UserSessionContext';
import ReanimatedShimmerLine from '@/components/CustomLoadingIndicatingLine';

const HOURS = Array.from({ length: 25 }, (_, i) => i);
// Performance optimization: Memoize screen width
const screenWidth = Dimensions.get('window').width;

// Cache for week page calculations
const weekPageCache = new Map<string, Date[][]>();

const buildWeekPages = (centerDate: Date) => {
  const cacheKey = centerDate.toISOString().split('T')[0];
  
  if (weekPageCache.has(cacheKey)) {
    return weekPageCache.get(cacheKey)!;
  }

  const pages = [-7, 0, 7].map((offset) => {
    const start = addDays(startOfWeek(addDays(centerDate, offset)), 0);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  });

  // Cache management
  if (weekPageCache.size > 30) {
    weekPageCache.clear();
  }
  
  weekPageCache.set(cacheKey, pages);
  return pages;
};

interface WeekViewProps {
  handleMonthYearChange: (month: number, year: number, day: number, fromDropdown: boolean) => void;
  fromDropdownRef: React.MutableRefObject<boolean>;
  loading?: boolean;
  refreshing?: boolean;
  onFinishRefresh?: () => void;
}

const WeekView = forwardRef(({ handleMonthYearChange, fromDropdownRef, loading, refreshing, onFinishRefresh }: WeekViewProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const hourListRef = useRef<FlatList>(null);
  const pagesListRef = useRef<FlatList>(null);
  const gridListRef = useRef<FlatList>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const tabBarHeight = useBottomTabBarHeight();
  const sharedX = React.useRef(new RNAnimated.Value(0)).current;
  const weekPages = React.useMemo(() => buildWeekPages(selectedDate), [selectedDate]);
  const { fetchEventsForWeek } = useEventContext();
  
  // Create shared values for worklet-safe state
  const isFromDropdown = useSharedValue(false);

  // Update shared values without accessing during render
  useEffect(() => {
    isFromDropdown.value = fromDropdownRef.current;
  }, [fromDropdownRef.current]);

  useImperativeHandle(ref, () => ({
    update: (date: Date) => {
      if (isFromDropdown.value) {
        setSelectedDate(date);
      }
    }
  }));

  useEffect(() => {
    // Fetch events for the current week when the component mounts, date changes, or refresh is triggered
    const fetchEvents = async () => {
      try {
        await fetchEventsForWeek(selectedDate);
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      } catch (error) {
        console.error('Error fetching week events:', error);
        if (refreshing && onFinishRefresh) {
          onFinishRefresh();
        }
      }
    };

    fetchEvents();
  }, [selectedDate, refreshing, fetchEventsForWeek, onFinishRefresh]);

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
      <View style={{ width: screenWidth, overflow: 'hidden', paddingBottom: 12, backgroundColor: themeColors.background }}>
        <ThemedView style={{ position: 'absolute', top: 0, width: 50, height: 50, zIndex: 999 }}/>
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
                loading={loading}
                refreshing={refreshing}
              />
            </View>
            )
          }}
        />
      </View>
    </ScrollView>
  );
});

export default React.memo(WeekView);