import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import SeeWhatFriendsAreUpTo from '@/components/Home/SeeWhatFriendsAreUpTo';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AISummary from './AISummary';

const HomeScreen = () => {
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets
  const [refreshing, setRefreshing] = useState(true);
  const [refreshingUpcomingEvents, setRefreshingUpcomingEvents] = useState(false);
  const [refreshingSeeWhatFriendsAreUpTo, setRefreshingSeeWhatFriendsAreUpTo] = useState(false);
  const [refreshingPastEvents, setRefreshingPastEvents] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshingUpcomingEvents(true);
    setRefreshingSeeWhatFriendsAreUpTo(true);
    setRefreshingPastEvents(true);
  }, []);

  const onFinishRefreshUpcomingEvents = useCallback(() => {
    setRefreshingUpcomingEvents(false);
  }, []);

  const onFinishRefreshSeeWhatFriendsAreUpTo = useCallback(() => {
    setRefreshingSeeWhatFriendsAreUpTo(false);
  }, []);

  const onFinishRefreshPastEvents = useCallback(() => {
    setRefreshingPastEvents(false);
  }, []);

  useEffect(() => {
    if (
      !refreshingUpcomingEvents &&
      !refreshingSeeWhatFriendsAreUpTo &&
      !refreshingPastEvents &&
      refreshing
    ) {
      setRefreshing(false);
    }
  }, [
    refreshingUpcomingEvents,
    refreshingSeeWhatFriendsAreUpTo,
    refreshingPastEvents
  ]);

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Scrollable Content */}
      <ScrollView
        stickyHeaderIndices={[0]}
        stickyHeaderHiddenOnScroll={true}
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedView
          style={{
            flex: 1,
            marginBottom: 6
          }}
        >
          <Header refreshing={refreshing}/>
        </ThemedView>
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16, paddingBottom: tabBarHeight }}>
          {/* <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AISummary />
          </ThemedView> */}
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <UpcomingEvents refreshing={refreshing} onFinishRefresh={onFinishRefreshUpcomingEvents} />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SeeWhatFriendsAreUpTo refreshing={refreshing} onFinishRefresh={onFinishRefreshSeeWhatFriendsAreUpTo}/>
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <PastEvents refreshing={refreshing} onFinishRefresh={onFinishRefreshPastEvents}/>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default HomeScreen;