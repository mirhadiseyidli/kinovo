import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { ThemedView } from '@/components/ThemedView';
import SearchBar from '@/components/SearchBar';
import EventSuggestions from '@/components/Explore/EventSuggestions';
import Categories from '@/components/Explore/Categories';
import Cities from '@/components/Explore/Cities';
import NearbyEvents from '@/components/Explore/NearbyEvents';
import useSearchEverythingDiscovery from '@/hooks/useSearchEverythingDiscovery';
import { User, Event } from '@/types/allTypes';

const DiscoverScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingNearbyEvents, setRefreshingNearbyEvents] = useState(false);
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  const [refreshingCities, setRefreshingCities] = useState(false);
  const [refreshingEventSuggestions, setRefreshingEventSuggestions] = useState(false);
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
    setRefreshingNearbyEvents(true);
    setRefreshingCategories(true);
    setRefreshingCities(true);
    setRefreshingEventSuggestions(true);
  }, []);

  const onFinishRefreshNearbyEvents = useCallback(() => {
    setRefreshingNearbyEvents(false);
  }, []);

  const onFinishRefreshCategories = useCallback(() => {
    setRefreshingCategories(false);
  }, []);

  const onFinishRefreshCities = useCallback(() => {
    setRefreshingCities(false);
  }, []);

  const onFinishRefreshEventSuggestions = useCallback(() => {
    setRefreshingEventSuggestions(false);
  }, []);

  useEffect(() => {
    if (
      !refreshingNearbyEvents &&
      !refreshingCategories &&
      !refreshingCities &&
      !refreshingEventSuggestions &&
      refreshing
    ) {
      setRefreshing(false);
    }
  }, [
    refreshingNearbyEvents,
    refreshingCategories,
    refreshingCities,
    refreshingEventSuggestions
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

        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16, paddingBottom: tabBarHeight }}>
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
            <NearbyEvents 
              refreshing={refreshingNearbyEvents} 
              onFinishRefresh={onFinishRefreshNearbyEvents} 
            />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Categories 
              refreshing={refreshingCategories}
              onFinishRefresh={onFinishRefreshCategories}
            />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Cities 
              refreshing={refreshingCities}
              onFinishRefresh={onFinishRefreshCities}
            />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <EventSuggestions 
              refreshing={refreshingEventSuggestions}
              onFinishRefresh={onFinishRefreshEventSuggestions}
            />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default DiscoverScreen;