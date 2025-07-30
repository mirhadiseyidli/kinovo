import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import DiscoverSearchBar from '@/components/DiscoverSearchBar';
import DiscoverSearchBarSuggestions from '@/components/DiscoverSearchBarSuggestions';
import Categories from '@/components/Explore/Categories';
import Cities from '@/components/Explore/Cities';
import NearbyEvents from '@/components/Explore/NearbyEvents.v2';
import FriendsEventsInfinite from '@/components/Explore/FriendsEventsInfinite';
import Event from '@/components/Event';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EventCardSkeleton } from '../Skeleton';
import useSearchEverythingDiscovery from '@/hooks/useSearchEverythingDiscovery';
import { useInfiniteEventsQuery } from '@/hooks/useInfiniteEventsQuery';
import { User, Event as EventType } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { useDiscoverError } from '@/context/DiscoverErrorContext';
import { DiscoverErrorMessage } from '@/components/Explore/DiscoverErrorMessage';
import { queryClient } from '@/utils/queryClient';

/**
 * Discover Screen v2 - Using FlashList for all content
 * 
 * This version uses a single FlashList to render all components as sections,
 * which enables proper virtualization and infinite scroll for recommended events.
 * 
 * Section Types:
 * - header: Search bar
 * - nearbyEvents: Nearby events section
 * - friendsEvents: Friends events section  
 * - categories: Categories grid
 * - cities: Cities section
 * - recommendedHeader: "Events You Might Like" header
 * - recommendedEvent: Individual recommended event
 * - recommendedFooter: Loading indicator for infinite scroll
 */

type SectionType = 
  | 'header'
  | 'errorMessage'
  | 'searchBar'
  | 'nearbyEvents'
  | 'friendsEvents'
  | 'categories'
  | 'cities'
  | 'recommendedHeader'
  | 'recommendedEvent'
  | 'recommendedFooter'
  | 'recommendedEmpty'
  | 'recommendedError';

interface SectionItem {
  id: string;
  type: SectionType;
  data?: any;
}

const DiscoverScreenV2 = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const flashListRef = useRef<FlashList<SectionItem>>(null);
  const tabBarHeight = useBottomTabBarHeight();
  const [refreshing, setRefreshing] = useState(false);
  const { fetchDiscoverySearchResults, loading } = useSearchEverythingDiscovery();
  const { errors, hasAnyError, setComponentError } = useDiscoverError();
  const [suggestions, setSuggestions] = useState<{ users: User[]; events: EventType[] }>({ users: [], events: [] });
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Refresh states for individual sections
  const [refreshingNearbyEvents, setRefreshingNearbyEvents] = useState(false);
  const [refreshingFriendsEvents, setRefreshingFriendsEvents] = useState(false);
  const [refreshingCategories, setRefreshingCategories] = useState(false);
  const [refreshingCities, setRefreshingCities] = useState(false);

  const headerHeight = useRef(0);
  const headerVisible = useRef(true);
  const lastScrollY = useRef(0);
  const isAtStart = useRef(true);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const diff = currentScrollY - lastScrollY.current;
    
    // Update isAtStart based on scroll position
    if (currentScrollY > 10 && isAtStart.current) {
      isAtStart.current = false;
    } else if (currentScrollY <= 10 && !isAtStart.current) {
      isAtStart.current = true;
    }
    
    // Only do hide/show animation when not at start (prevents pull-to-refresh conflicts)
    if (!isAtStart.current) {
      if (diff > 5 && headerVisible.current) {
        // Start hiding immediately when scrolling down
        headerVisible.current = false;
        if (headerHeight.current > 0) {
          translateY.value = withTiming(-headerHeight.current, { duration: 300 });
        }
      } else if (diff < -5 && !headerVisible.current) {
        // Show when scrolling up
        headerVisible.current = true;
        translateY.value = withTiming(0, { duration: 300 });
      }
    } else {
      // Always show header when at start
      if (!headerVisible.current) {
        headerVisible.current = true;
        translateY.value = 0; // No animation at start
      }
    }
    
    lastScrollY.current = currentScrollY;
  };

  const translateY = useSharedValue(0);

  // Cleanup any running animations on unmount
  React.useEffect(() => {
    return () => {
      // Cancel any running animation
      translateY.value = translateY.value; // This stops the animation
    };
  }, []);

  const headerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });


  // Use infinite query for recommended events
  const {
    events: recommendedEvents,
    isLoading: isLoadingRecommended,
    isError: isErrorRecommended,
    error: recommendedError,
    hasMore: hasMoreRecommended,
    loadMore: loadMoreRecommended,
    isFetchingNextPage,
    refetch: refetchRecommended,
  } = useInfiniteEventsQuery({
    eventType: 'recommended',
    pageSize: 5,
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });

  // Report recommended events errors to centralized error handling
  React.useEffect(() => {
    setComponentError('recommendedEvents', isErrorRecommended);
  }, [isErrorRecommended, setComponentError]);

  // Search functionality
  const searchResults = async () => {
    const results = await fetchDiscoverySearchResults(searchQuery);
    if (results) {
      setSuggestions(results);
    } else {
      setSuggestions({ users: [], events: [] });
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchResults();
        setIsSearchActive(true);
      } else {
        setSuggestions({ users: [], events: [] });
        setIsSearchActive(false);
        setShowSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Show suggestions when there are results and search is active
  useEffect(() => {
    setShowSuggestions(isSearchActive && (suggestions.users.length > 0 || suggestions.events.length > 0));
  }, [isSearchActive, suggestions.users.length, suggestions.events.length]);

  // Refresh handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshingNearbyEvents(true);
    setRefreshingFriendsEvents(true);
    setRefreshingCategories(true);
    setRefreshingCities(true);
    
    try {
      // Invalidate all event-related queries to force fresh data
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['nearbyEvents'] });
      await queryClient.invalidateQueries({ queryKey: ['friendsEvents'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['cities'] });
      await queryClient.invalidateQueries({ queryKey: ['recommendedEvents'] });
      
      // Refresh recommended events
      await refetchRecommended();
    } catch (error) {
      console.error('Discover refresh failed:', error);
    } finally {
      // Other sections will handle their own refresh
      setRefreshing(false);
    }
  }, [refetchRecommended]);

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

  // Suggestions handlers
  const handleUserPress = useCallback((user: User) => {
    router.push({
      pathname: "/(auth)/profile/[_id]" as const,
      params: { _id: user._id }
    });
    setSearchQuery('');
    setIsSearchActive(false);
    setShowSuggestions(false);
  }, [router]);

  const handleEventPress = useCallback((event: EventType) => {
    if (event._id) {
      router.push({
        pathname: "/(auth)/viewEvent/[event_id]" as const,
        params: { event_id: event._id }
      });
    }
    setSearchQuery('');
    setIsSearchActive(false);
    setShowSuggestions(false);
  }, [router]);

  const handleBackdropPress = useCallback(() => {
    setShowSuggestions(false);
    setIsSearchActive(false);
  }, []);


  // Build sections data
  const buildSections = useCallback((): SectionItem[] => {
    const sections: SectionItem[] = [];

    // Header as first item in the list
    sections.push({ id: 'header', type: 'header' });
    
    // Error message if any component has errors
    if (hasAnyError) {
      sections.push({ id: 'errorMessage', type: 'errorMessage' });
    }
    
    // Search bar
    sections.push({ id: 'searchBar', type: 'searchBar' });

    // Main sections
    sections.push({ id: 'nearbyEvents', type: 'nearbyEvents' });
    sections.push({ id: 'friendsEvents', type: 'friendsEvents' });
    sections.push({ id: 'categories', type: 'categories' });
    sections.push({ id: 'cities', type: 'cities' });

    // Recommended events header
    sections.push({ id: 'recommendedHeader', type: 'recommendedHeader' });

    // Handle different states for recommended events
    if (isLoadingRecommended && recommendedEvents.length === 0) {
      // Show skeleton
      sections.push({ id: 'recommendedLoading', type: 'recommendedEmpty', data: 'loading' });
    } else if (isErrorRecommended && recommendedEvents.length === 0) {
      // Show error
      sections.push({ id: 'recommendedError', type: 'recommendedError' });
    } else if (recommendedEvents.length === 0) {
      // Show empty state
      sections.push({ id: 'recommendedEmpty', type: 'recommendedEmpty', data: 'empty' });
    } else {
      // Add individual events
      recommendedEvents.forEach((event, index) => {
        sections.push({
          id: `recommendedEvent-${event._id || index}`,
          type: 'recommendedEvent',
          data: event,
        });
      });

      // Add footer if there are more events to load
      if (hasMoreRecommended || isFetchingNextPage) {
        sections.push({ id: 'recommendedFooter', type: 'recommendedFooter' });
      }
    }

    return sections;
  }, [recommendedEvents, isLoadingRecommended, isErrorRecommended, hasMoreRecommended, isFetchingNextPage, hasAnyError]);

  // Render item based on section type
  const renderItem = useCallback(({ item }: ListRenderItemInfo<SectionItem>) => {
    switch (item.type) {
      case 'header':
        return (
          <Animated.View 
            style={[
              headerStyle,
              { 
                position: 'relative',
                zIndex: 1000,
                marginBottom: 8
              }
            ]}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              if (height !== headerHeight.current) {
                headerHeight.current = height;
              }
            }}
          >
            <Header />
          </Animated.View>
        );

      case 'errorMessage':
        return <DiscoverErrorMessage errors={errors} showCachedDataWarning={true} />;

      case 'searchBar':
        return (
          <View style={{ marginTop: 5, marginBottom: 24, paddingHorizontal: 16 }}>
            <DiscoverSearchBar
              inputValue={searchQuery}
              setInputValue={setSearchQuery}
              suggestions={suggestions}
              placeholder="Search for events or friends..."
              onSearchActiveChange={setIsSearchActive}
            />
          </View>
        );

      case 'nearbyEvents':
        return (
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 24 }}>
            <NearbyEvents
              refreshing={refreshingNearbyEvents}
              onFinishRefresh={onFinishRefreshNearbyEvents}
            />
          </ThemedView>
        );

      case 'friendsEvents':
        return (
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 24 }}>
            <FriendsEventsInfinite
              refreshing={refreshingFriendsEvents}
              onFinishRefresh={onFinishRefreshFriendsEvents}
            />
          </ThemedView>
        );

      case 'categories':
        return (
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 24 }}>
            <Categories
              refreshing={refreshingCategories}
              onFinishRefresh={onFinishRefreshCategories}
            />
          </ThemedView>
        );

      case 'cities':
        return (
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 24 }}>
            <Cities
              refreshing={refreshingCities}
              onFinishRefresh={onFinishRefreshCities}
            />
          </ThemedView>
        );

      case 'recommendedHeader':
        return (
          <ThemedView style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Events You Might Like</ThemedText>
              <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary }}>
                {recommendedEvents.length} events
              </ThemedText>
            </ThemedView>
          </ThemedView>
        );

      case 'recommendedEvent':
        return (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Event event={item.data} loading={false} />
          </View>
        );

      case 'recommendedEmpty':
        if (item.data === 'loading') {
          return (
            <View style={{ paddingHorizontal: 16 }}>
              <EventCardSkeleton count={2} />
            </View>
          );
        }
        return (
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.background,
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              marginHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
            }}
            onPress={() => refetchRecommended()}
          >
            <View style={{ marginBottom: 12 }}>
              <IconSymbol
                name="star.fill"
                size={32}
                color={themeColors.placeholderTextColor}
              />
            </View>
            <ThemedText
              style={{
                fontSize: 16,
                textAlign: 'center',
                color: themeColors.placeholderTextColor,
                fontWeight: '600'
              }}
            >
              No recommended events yet
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                color: themeColors.placeholderTextColor,
              }}
            >
              Add more interests to get personalized suggestions
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                textAlign: 'center',
                marginTop: 8,
                color: themeColors.placeholderTextColor,
              }}
            >
              Tap to refresh
            </ThemedText>
          </TouchableOpacity>
        );

      case 'recommendedError':
        return (
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.background,
              borderRadius: 12,
              padding: 16,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              marginHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
            }}
            onPress={() => refetchRecommended()}
          >
            <View style={{ marginBottom: 12 }}>
              <IconSymbol
                name="exclamationmark.triangle.fill"
                size={32}
                color={themeColors.placeholderTextColor}
              />
            </View>
            <ThemedText
              style={{
                fontSize: 16,
                textAlign: 'center',
                color: themeColors.textSecondary,
                marginBottom: 8,
              }}
            >
              Unable to load recommendations
            </ThemedText>
            <ThemedText
              style={{
                fontSize: 14,
                textAlign: 'center',
                color: themeColors.textThird,
              }}
            >
              Tap to try again
            </ThemedText>
          </TouchableOpacity>
        );

      case 'recommendedFooter':
        return (
          <View style={{ 
            padding: 16, 
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <ThemedText style={{ 
              color: themeColors.textSecondary,
              fontSize: 14,
            }}>
              Loading more events...
            </ThemedText>
          </View>
        );

      default:
        return null;
    }
  }, [
    searchQuery,
    loading,
    suggestions,
    isSearchActive,
    refreshingNearbyEvents,
    refreshingFriendsEvents,
    refreshingCategories,
    refreshingCities,
    recommendedEvents,
    themeColors,
    refetchRecommended,
    onFinishRefreshNearbyEvents,
    onFinishRefreshFriendsEvents,
    onFinishRefreshCategories,
    onFinishRefreshCities,
    errors,
  ]);

  // Get item type for FlashList optimization
  const getItemType = useCallback((item: SectionItem) => {
    return item.type;
  }, []);

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMoreRecommended && !isFetchingNextPage) {
      loadMoreRecommended();
    }
  }, [hasMoreRecommended, isFetchingNextPage, loadMoreRecommended]);

  const sections = buildSections();

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* FlashList with header as first item */}
      <FlashList
        ref={flashListRef}
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        getItemType={getItemType}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: tabBarHeight + 20,
        }}
        estimatedItemSize={300}
        removeClippedSubviews={true}
        drawDistance={200}
        onScroll={handleScroll}
      />

      {/* Suggestions component rendered outside FlashList */}
      <DiscoverSearchBarSuggestions
        visible={showSuggestions}
        suggestions={suggestions}
        onUserPress={handleUserPress}
        onEventPress={handleEventPress}
        onBackdropPress={handleBackdropPress}
      />
    </ThemedView>
  );
};

export default DiscoverScreenV2;

/**
 * Migration Summary:
 * 
 * CHANGED:
 * - Replaced ScrollView with FlashList for better performance
 * - All components are now rendered as sections in the FlashList
 * - Recommended events support infinite scroll with pagination
 * - Better performance with large lists
 * 
 * BENEFITS:
 * - Superior performance with FlashList
 * - Proper virtualization for all content
 * - Infinite scroll for recommended events
 * - Better memory management
 * - Smooth scrolling performance
 * - No VirtualizedList nesting issues
 * - Optimized rendering with getItemType
 * 
 * STRUCTURE:
 * - Each section has a type and renders accordingly
 * - Recommended events are rendered individually for virtualization
 * - Loading and error states are handled as sections
 * - Footer shows loading indicator during pagination
 */