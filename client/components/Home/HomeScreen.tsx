import React, { useState, useRef, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import SeeWhatFriendsAreUpTo from '@/components/Home/SeeWhatFriendsAreUpTo';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const HomeScreen = () => {
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets
  const [refreshing, setRefreshing] = useState(true);
  const [refreshingUpcomingEvents, setRefreshingUpcomingEvents] = useState(true);
  const [refreshingSeeWhatFriendsAreUpTo, setRefreshingSeeWhatFriendsAreUpTo] = useState(true);
  const [refreshingPastEvents, setRefreshingPastEvents] = useState(true);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshingUpcomingEvents(true);
    setRefreshingSeeWhatFriendsAreUpTo(true);
    setRefreshingPastEvents(true);
  }, []);

  const onFinishRefreshUpcomingEvents = () => {
    setRefreshingUpcomingEvents(false);
  };

  const onFinishRefreshSeeWhatFriendsAreUpTo = () => {
    setRefreshingSeeWhatFriendsAreUpTo(false);
  };

  const onFinishRefreshPastEvents = () => {
    setRefreshingPastEvents(false);
  };

  useFocusEffect(
    useCallback(() => {
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
    ])
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Scrollable Content */}
      <ScrollView
        stickyHeaderIndices={[0]}
        stickyHeaderHiddenOnScroll={true}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight,
        }}
        scrollEventThrottle={8}
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
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
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