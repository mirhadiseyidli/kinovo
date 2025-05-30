import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AttentionRequired from './AttentionRequired';

const HomeScreen = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(true);
  const [refreshingUpcomingEvents, setRefreshingUpcomingEvents] = useState(false);
  const [refreshingAttentionRequired, setRefreshingAttentionRequired] = useState(false);
  const [refreshingPastEvents, setRefreshingPastEvents] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshingUpcomingEvents(true);
    setRefreshingAttentionRequired(true);
    setRefreshingPastEvents(true);
  }, []);

  const onFinishRefreshUpcomingEvents = useCallback(() => {
    setRefreshingUpcomingEvents(false);
  }, []);

  const onFinishRefreshAttentionRequired = useCallback(() => {
    setRefreshingAttentionRequired(false);
  }, []);

  const onFinishRefreshPastEvents = useCallback(() => {
    setRefreshingPastEvents(false);
  }, []);

  useEffect(() => {
    if (
      !refreshingUpcomingEvents &&
      !refreshingAttentionRequired &&
      !refreshingPastEvents &&
      refreshing
    ) {
      setRefreshing(false);
    }
  }, [
    refreshingUpcomingEvents,
    refreshingAttentionRequired,
    refreshingPastEvents
  ]);

  return (
    <ThemedView style={{ flex: 1 }}>
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
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingBottom: tabBarHeight }}>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <UpcomingEvents refreshing={refreshing} onFinishRefresh={onFinishRefreshUpcomingEvents} />
          </ThemedView>
          <ThemedView style={{ width: '100%' }}>
            <AttentionRequired refreshing={refreshing} onFinishRefresh={onFinishRefreshAttentionRequired} />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <PastEvents refreshing={refreshing} onFinishRefresh={onFinishRefreshPastEvents}/>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default HomeScreen;