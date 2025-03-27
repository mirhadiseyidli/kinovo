import React, { useState, useRef, useCallback } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import SeeWhatFriendsAreUpTo from '@/components/Home/SeeWhatFriendsAreUpTo';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import AISummary from './AISummary';

const HomeScreen = () => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets
  const [refreshing, setRefreshing] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: Call your data fetching logic here
    // Example:
    fetchSuggestions().finally(() => setRefreshing(false));
  }, []);

  const fetchSuggestions = async () => {
    console.log('test')
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ThemedView
        style={{
          flex: 1,
          flexGrow: 1,
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6,
        }}
      >
        <Header />
      </ThemedView>
      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight
        }}
        onScroll={handleScroll}
        scrollEventThrottle={8}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
          {/* <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AISummary />
          </ThemedView> */}
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <UpcomingEvents />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SeeWhatFriendsAreUpTo />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <PastEvents />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default HomeScreen;