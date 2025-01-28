import React, { useState, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import SeeWhatFriendsAreUpTo from '@/components/Home/SeeWhatFriendsAreUpTo';
import PastEvents from '@/components/Home/PastEvents';
import { ThemedView } from '@/components/ThemedView';
import SearchBar from '@/components/SearchBar'; // Import the SearchBar component
import EventSuggestions from '@/components/Explore/EventSuggestions';
import Categories from '@/components/Explore/Categories';
import Cities from '@/components/Explore/Cities';
import NearbyEvents from '@/components/Explore/NearbyEvents';

const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  return (
    <ThemedView className="flex-1">
      {/* Header Positioned at the Top */}
      <ThemedView
        className="flex-grow"
        style={{
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6,
        }}
      >
        <Header />
      </ThemedView>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 flex-col" // Add margin equal to header height
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Search Bar */}
        <ThemedView className="mb-4 items-center">
          <SearchBar
            placeholder="Search for events or friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </ThemedView>

        {/* Main Content */}
        <ThemedView className='flex flex-col gap-0.5'>
          <ThemedView className='flex-[1] items-center justify-center'>
            <NearbyEvents />
          </ThemedView>
          <ThemedView className='flex-[1] items-center justify-center'>
            <Categories />
          </ThemedView>
          <ThemedView className='flex-[1] items-center justify-center'>
            <Cities />
          </ThemedView>
          <ThemedView className='flex-[1] items-center justify-center'>
            <EventSuggestions />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default DiscoverScreen;