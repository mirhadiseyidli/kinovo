import { StyleSheet, Text, RefreshControl, StatusBar, View, Dimensions, ScrollView, InteractionManager } from 'react-native';
import React, { useCallback, useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import CalendarHeader from '@/components/Calendar/CalendarHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CalendarViewProvider, useCalendarViewContext } from '@/context/CalendarViewContext';
import { CalendarProvider, useCalendarContext } from '@/context/CalendarProvider.v2';
import WeekView from '@/components/Calendar/WeekView';
import FlashListScheduleView from '@/components/Calendar/ScheduleView/FlashListScheduleView';
import MonthView from '@/components/Calendar/MonthView';
import { CalendarErrorProvider } from '@/context/CalendarErrorContext';

function RenderedCalendarView({
  refreshing,
  onFinishFetching,
}: {
  refreshing: boolean;
  onFinishFetching: () => void;
}) {
  const { view } = useCalendarViewContext();

  return (
    <View style={{ flex: 1 }}>
      {view.toLowerCase() === 'month' ? (
        <MonthView
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      ) : view.toLowerCase() === 'week' ? (
        <WeekView
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      ) : (
        <FlashListScheduleView
          refreshing={refreshing}
          onFinishRefresh={onFinishFetching}
        />
      )}
    </View>
  );
}

function CalendarContent() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [refreshing, setRefreshing] = useState(false);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const colorScheme = useColorScheme();

  // Bridge between old CalendarViewContext and new CalendarProvider.v2
  const { view } = useCalendarViewContext();
  const { setCurrentView } = useCalendarContext();

  // Sync view changes from CalendarViewContext to CalendarProvider.v2
  useEffect(() => {
    if (view && typeof view === 'string') {
      const mappedView = view as 'Month' | 'Week' | 'Schedule';
      setCurrentView(mappedView);
    }
  }, [view, setCurrentView]);


  // Stabilize layout on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const onFinishFetching = useCallback(() => {
    setRefreshing(false);
  }, []);

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
          <CalendarHeader
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
          <RenderedCalendarView
            refreshing={refreshing}
            onFinishFetching={onFinishFetching}
          />
        </>
      )}
    </ThemedView>
  );
}

export default function Calendar() {
  try {
    // CalendarViewProvider is already set up in _layout.tsx, so we can access view here
    const { view } = useCalendarViewContext();
    
    // Map view string to CalendarProvider.v2 view type
    const initialView = view && typeof view === 'string' 
      ? (view as 'Month' | 'Week' | 'Schedule')
      : 'Month';

    return (
      <CalendarErrorProvider>
        <CalendarProvider initialView={initialView}>
          <CalendarContent />
        </CalendarProvider>
      </CalendarErrorProvider>
    );
  } catch (error) {
    console.error('Error in Calendar component:', error);
    
    // Fallback to basic calendar without context
    return (
      <CalendarErrorProvider>
        <CalendarProvider initialView="Month">
          <CalendarContent />
        </CalendarProvider>
      </CalendarErrorProvider>
    );
  }
};
