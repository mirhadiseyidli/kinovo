import React, { useState, useRef } from 'react';
import { ScrollView } from 'react-native';
import Header from '@/components/Header';
import UpcomingEvents from '@/components/Home/UpcomingEvents';
import { ThemedView } from '@/components/ThemedView';
import SeeWhatFriendsAreUpTo from '@/components/Home/SeeWhatFriendsAreUpTo';
import PastEvents from '@/components/Home/PastEvents';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HomeScreen = () => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  const handleButtonPress = () => {
    if (showScrollToTop) {
      // Scroll to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Create Event Logic
      console.log('Create Event Pressed');
    }
  };

  return (
    <ThemedView className="flex-1">
      <ThemedView
        className="flex-grow"
        style={{
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6
        }}
      >
        <Header />
      </ThemedView>
      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 flex-col"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ThemedView className='flex flex-col gap-0.5'>
          <ThemedView className='flex-[1] items-center justify-center'>
            <UpcomingEvents />
          </ThemedView>
          <ThemedView className='flex-[1] items-center justify-center'>
            <SeeWhatFriendsAreUpTo />
          </ThemedView>
          <ThemedView className='flex-[1] items-center justify-center'>
            <PastEvents />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default HomeScreen;