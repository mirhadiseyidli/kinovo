import { StyleSheet, Image, RefreshControl, StatusBar, View, Dimensions } from 'react-native';
import React, { useCallback, useState, useEffect } from 'react';
// import { Collapsible } from '@/components/Collapsible';
// import { ExternalLink } from '@/components/ExternalLink';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import CalendarHeader from '@/components/Calendar/CalendarHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ScrollView } from 'react-native-gesture-handler';
import Dropdown from '@/components/DropdownCustom';
import MonthView from '@/components/Calendar/MonthView';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import WeekView from '@/components/Calendar/WeekView';
import ThreeDaysView from '@/components/Calendar/ThreeDaysView';
import DayView from '@/components/Calendar/DayView';
import ScheduleView from '@/components/Calendar/ScheduleView';

export default function Calendar() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const dropdownOptions = ['Month', 'Week', '3 day', 'Day', 'Schedule'];
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState('month');
  const [selectedView, setSelectedView] = useState('Month')

  const handleMonthYearChange = (month: number, year: number) => {
    const newDate = new Date(year, month);
    setDate(newDate);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(false);
  }, []);

  const renderView = () => {
    switch(view) {
      case 'month':
        return <MonthView month={date.getMonth()} year={date.getFullYear()} />;
      case 'week':
        return <WeekView month={date.getMonth()} year={date.getFullYear()}/>;
      case '3 day':
        return <ThreeDaysView />;
      case 'day':
        return <DayView />;
      case 'schedule':
        return <ScheduleView />;
      default:
        return null;
    }
  };

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: tabBarHeight }}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <ThemedView style={{ flex: 1, height: 'auto' }}>
        {/* Scrollable Content */}
        <ScrollView
          stickyHeaderIndices={[0]}
          stickyHeaderHiddenOnScroll={false}
          style={{ 
            flex: 1,
            paddingBottom: tabBarHeight
          }}
          scrollEventThrottle={8}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ThemedView style={{ flex: 1, marginBottom: 16 }}>
            <CalendarHeader currentDate={date} setDate={setDate} onMonthYearChange={handleMonthYearChange} />
          </ThemedView>
          <ThemedView style={{ flex: 1, paddingHorizontal: 16, position: 'relative', marginBottom: 16 }}>
            <Dropdown 
              options={dropdownOptions} 
              selected={selectedView}
              onChange={(view) => {
                setSelectedView(view);
                setView(view.toLowerCase());
              }}
            />
          </ThemedView>
          <Animated.View
            key={`${view}-${date.getFullYear()}-${date.getMonth()}`}
            entering={FadeIn.delay(10).duration(1000).withInitialValues({ opacity: 0, transform: [{ scale: 0.95 }] })}
            exiting={FadeOut.delay(10).duration(1000).withInitialValues({ opacity: 1, transform: [{ scale: 1 }] })}
          >
            {renderView()}
          </Animated.View>
        </ScrollView>
      </ThemedView>  
    </ThemedView>
  );
};
