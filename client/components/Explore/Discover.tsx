import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
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
import useSearchEverythingDiscovery from '@/hooks/useSearchEverythingDiscovery';
import { User, Event } from '@/types/allTypes';

const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets(); // Safe area insets
  const [refreshing, setRefreshing] = useState(true);
  const [refreshingUpcomingEvents, setRefreshingUpcomingEvents] = useState(false);
  const [refreshingSeeWhatFriendsAreUpTo, setRefreshingSeeWhatFriendsAreUpTo] = useState(false);
  const [refreshingPastEvents, setRefreshingPastEvents] = useState(false);
  const { fetchDiscoverySearchResults, loading } = useSearchEverythingDiscovery();
  const [suggestions, setSuggestions] = useState<{ users: User[]; events: Event[] }>({ users: [], events: [] });

  const searchResults = async () => {
    const results = await fetchDiscoverySearchResults(searchQuery);
    if (results) {
      setSuggestions(results);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchResults();
      }
    }, 300);
  
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

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
        style={{ flex: 1 }} // Ensure scrolling layout
        scrollEventThrottle={16}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Positioned at the Top */}
        <ThemedView
          style={{
            flex: 1,
            marginBottom: 6
          }}
        >
          <Header refreshing={refreshing}/>
        </ThemedView>

        {/* Main Content */}
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16, paddingBottom: tabBarHeight }}>
          {/* Search Bar */}
          <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <SearchBar
              inputValue={searchQuery}
              setInputValue={setSearchQuery}
              suggestions={suggestions}
              handleAdd={() => console.log('buh')}
              placeholder="Search for events or friends..."
            />
          </ThemedView>
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