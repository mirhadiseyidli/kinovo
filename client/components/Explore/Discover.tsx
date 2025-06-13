import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { ThemedView } from '@/components/ThemedView';
import DiscoverSearchBar from '@/components/DiscoverSearchBar';
import EventSuggestions from '@/components/Explore/EventSuggestions';
import Categories from '@/components/Explore/Categories';
import Cities from '@/components/Explore/Cities';
import NearbyEvents from '@/components/Explore/NearbyEvents';
import FriendsEvents from '@/components/Explore/FriendsEvents';
import useSearchEverythingDiscovery from '@/hooks/useSearchEverythingDiscovery';
import { User, Event } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const DiscoverScreen = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingNearbyEvents, setRefreshingNearbyEvents] = useState(false);
  const [refreshingFriendsEvents, setRefreshingFriendsEvents] = useState(false);
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  const [refreshingCities, setRefreshingCities] = useState(false);
  const [refreshingEventSuggestions, setRefreshingEventSuggestions] = useState(false);
  const { fetchDiscoverySearchResults, loading } = useSearchEverythingDiscovery();
  const [suggestions, setSuggestions] = useState<{ users: User[]; events: Event[] }>({ users: [], events: [] });
  const [isSearchActive, setIsSearchActive] = useState(false);

  const searchResults = async () => {
    const results = await fetchDiscoverySearchResults(searchQuery);
    if (results) {
      setSuggestions(results);
    } else {
      setSuggestions({ users: [], events: [] });
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchResults();
        setIsSearchActive(true);
      } else {
        setSuggestions({ users: [], events: [] });
        setIsSearchActive(false);
      }
    }, 300);
  
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Check if suggestions should be shown
  const showSuggestions = isSearchActive && (suggestions.users.length > 0 || suggestions.events.length > 0);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshingNearbyEvents(true);
    setRefreshingFriendsEvents(true);
    setRefreshingCategories(true);
    setRefreshingCities(true);
    setRefreshingEventSuggestions(true);
  }, []);

  const onFinishRefreshNearbyEvents = useCallback(() => {
    setRefreshingNearbyEvents(false);
  }, []);

  const onFinishRefreshFriendsEvents = useCallback(() => {
    setRefreshingFriendsEvents(false);
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
      !refreshingFriendsEvents &&
      !refreshingCategories &&
      !refreshingCities &&
      !refreshingEventSuggestions &&
      refreshing
    ) {
      setRefreshing(false);
    }
  }, [
    refreshingNearbyEvents,
    refreshingFriendsEvents,
    refreshingCategories,
    refreshingCities,
    refreshingEventSuggestions
  ]);

  const handleBackdropPress = () => {
    setIsSearchActive(false);
    setSuggestions({ users: [], events: [] });
  };

  

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        stickyHeaderIndices={[0]}
        stickyHeaderHiddenOnScroll={true}
        scrollEventThrottle={16}
        scrollEnabled={!showSuggestions} // Only disable scroll when suggestions are visible
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
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
          {/* Search Bar Container */}
          <ThemedView style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingHorizontal: 16
          }}>
            <DiscoverSearchBar
              inputValue={searchQuery}
              setInputValue={setSearchQuery}
              suggestions={suggestions}
              placeholder="Search for events or friends..."
              onSearchActiveChange={setIsSearchActive}
            />
          </ThemedView>

          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <NearbyEvents 
              refreshing={refreshingNearbyEvents} 
              onFinishRefresh={onFinishRefreshNearbyEvents} 
            />
          </ThemedView>

          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <FriendsEvents 
              refreshing={refreshingFriendsEvents}
              onFinishRefresh={onFinishRefreshFriendsEvents}
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
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
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