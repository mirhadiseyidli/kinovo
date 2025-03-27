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
    <ThemedView style={{ flex: 1 }}>
      {/* Header Positioned at the Top */}
      <ThemedView
        style={{
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
          flexDirection: 'column',
          paddingBottom: tabBarHeight,
        }} // Ensure scrolling layout
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Search Bar */}
        <ThemedView style={{ marginBottom: 16, alignItems: 'center', paddingHorizontal: 16 }}>
          <SearchBar
            placeholder="Search for events or friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </ThemedView>

        {/* Main Content */}
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <NearbyEvents />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Categories />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Cities />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <EventSuggestions />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default DiscoverScreen;