import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EventCardSkeleton } from '@/components/Skeleton';
import { Feather } from '@expo/vector-icons';
import { useInfiniteNearbyEvents } from '@/hooks/useInfiniteEvents';

/**
 * NEW Simplified TanStack React Query version of NearbyEvents stack page
 * 
 * Key improvements over the old implementation:
 * - Uses new useInfiniteNearbyEvents hook with simplified architecture
 * - Direct cache updates instead of invalidations
 * - Single event store with tagging system
 * - Better performance through unified caching
 * - Simplified query key management
 * 
 * Migration changes from old useInfiniteEventsQuery:
 * - Replaced useInfiniteEventsQuery with useInfiniteNearbyEvents
 * - Updated data extraction to use pages.flatMap pattern
 * - Aligned with new simplified TanStack Query architecture
 * - Benefits from single event store and direct cache updates
 */

const NearbyEventsPageV2 = () => {
  const { distance, lat, lng, city, state } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Parse location parameters
  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const distanceValue = parseInt(distance as string);

  // New simplified TanStack React Query infinite hook
  const nearbyEventsQuery = useInfiniteNearbyEvents(
    latitude,
    longitude,
    distanceValue,
    6 // First page loads 6 events, matches legacy behavior
  );

  // Extract data from the new hook structure
  const events = useMemo(() => {
    return nearbyEventsQuery.data?.pages.flatMap(page => page.events) || [];
  }, [nearbyEventsQuery.data]);

  const isLoading = nearbyEventsQuery.isLoading;
  const isFetchingNextPage = nearbyEventsQuery.isFetchingNextPage;
  const hasMore = nearbyEventsQuery.hasNextPage || false;
  const error = nearbyEventsQuery.error;
  const isError = nearbyEventsQuery.isError;
  const loadMore = nearbyEventsQuery.fetchNextPage;
  const refetch = nearbyEventsQuery.refetch;
  const totalCount = nearbyEventsQuery.data?.pages?.[0]?.totalCount || 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing nearby events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !isFetchingNextPage) {
      await loadMore();
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMore();
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          title: 'Nearby Events',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView 
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
            <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
            />
        }
      >
      {/* Header Card */}
      <ThemedView 
        style={{ 
          backgroundColor: themeColors.mountainGreen,
          padding: 16,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          margin: 16
        }}
      >
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Feather 
            name="map-pin" 
            size={48} 
            color="white" 
            style={{ marginBottom: 8 }}
          />
          <ThemedText style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: 4,
            textAlign: 'center'
          }}>
            Nearby Events
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 16, 
            color: 'white', 
            opacity: 0.9,
            textAlign: 'center'
          }}>
            {city && state ? `${city}, ${state}` : 'Your Location'}
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 14, 
            color: 'white', 
            opacity: 0.8,
            textAlign: 'center',
            marginTop: 4
          }}>
            Within {distance} miles
          </ThemedText>
        </View>
      </ThemedView>

      {/* Enhanced Error State with retry option */}
      {isError && (
        <View style={{
          backgroundColor: themeColors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor: '#ff6b6b',
        }}>
          <ThemedText style={{ 
            color: '#ff6b6b',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8 
          }}>
            Unable to load nearby events
          </ThemedText>
          <ThemedText style={{ 
            color: themeColors.text,
            fontSize: 14,
            opacity: 0.8,
            marginBottom: 12
          }}>
            {error?.message || 'Something went wrong while loading nearby events.'}
          </ThemedText>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              backgroundColor: themeColors.mountainGreen,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              alignSelf: 'flex-start',
            }}
          >
            <ThemedText style={{ 
              color: themeColors.text,
              fontSize: 14,
              fontWeight: '600'
            }}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Events Section */}
      <ThemedView style={{ padding: 16 }}>
        <ThemedView style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'baseline', 
          marginBottom: 16 
        }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
            All Events
          </ThemedText>
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {isLoading ? '...' : `${events.length} events`}
          </ThemedText>
        </ThemedView>

        {/* Show stale data indicator when there's an error but we have cached data */}
        {isError && events.length > 0 && (
          <View style={{
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(255, 193, 7, 0.3)',
          }}>
            <ThemedText style={{ 
              color: '#f59e0b',
              fontSize: 12,
              fontWeight: '500',
              textAlign: 'center'
            }}>
              ⚠️ Showing cached data - tap "Try Again" above to refresh
            </ThemedText>
          </View>
        )}

        {/* Events List */}
        <ThemedView style={{ gap: 16, opacity: isError ? 0.8 : 1 }}>
          {isLoading && events.length === 0 ? (
            <EventCardSkeleton count={3} />
          ) : events.length > 0 ? (
            events.map((event) => (
              <Event
                key={event._id}
                event={event}
                loading={false}
              />
            ))
          ) : !isLoading && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/(createEvent)/EventDetails')}
              style={{
                backgroundColor: themeColors.background,
                borderRadius: 12,
                padding: 16,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: themeColors.border,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 120,
                marginTop: 8,
              }}
            >
              <ThemedView style={{ marginBottom: 12 }}>
                <IconSymbol
                  name="map.fill"
                  size={32}
                  color={themeColors.placeholderTextColor}
                />
              </ThemedView>
              <ThemedText style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                textAlign: 'center',
                color: themeColors.textSecondary,
                marginBottom: 4
              }}>
                No Nearby Events Found
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                textAlign: 'center',
                color: themeColors.textThird,
                marginBottom: 8
              }}>
                Be the first to create an event in this area
              </ThemedText>
              <ThemedText style={{ 
                fontSize: 14, 
                fontWeight: '600',
                color: themeColors.mountainGreen,
                textAlign: 'center'
              }}>
                Tap to Create Event
              </ThemedText>
            </TouchableOpacity>
          )}

          {/* Load More Indicator */}
          {isFetchingNextPage && (
            <ThemedView style={{ 
              padding: 20, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <View style={{
                backgroundColor: themeColors.mountainGreen,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <View style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: 'white',
                  borderTopColor: 'transparent',
                  // animation: 'spin 1s linear infinite',
                }} />
                <ThemedText style={{ 
                  color: 'white',
                  fontSize: 12,
                  fontWeight: '600'
                }}>
                  Loading more events...
                </ThemedText>
              </View>
            </ThemedView>
          )}

          {/* End of list indicator */}
          {!hasMore && events.length > 0 && !isLoading && (
            <ThemedView style={{ 
              padding: 20, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <ThemedText style={{ 
                color: themeColors.textSecondary,
                fontSize: 14,
                textAlign: 'center'
              }}>
                You've reached the end of nearby events
              </ThemedText>
              {totalCount > 0 && (
                <ThemedText style={{
                  fontSize: 12,
                  color: themeColors.textSecondary,
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                  Showing {events.length} of {totalCount} events
                </ThemedText>
              )}
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
    </ThemedView>
  );
};

export default NearbyEventsPageV2;

/**
 * Migration Summary:
 * 
 * CHANGED (New Implementation):
 * - useInfiniteEventsQuery → useInfiniteNearbyEvents (simplified)
 * - Object-based params → Direct function parameters
 * - Complex data extraction → Simple pages.flatMap pattern
 * - Multiple query invalidations → Direct cache updates
 * - Custom query keys → Standardized query keys
 * 
 * PRESERVED (Unchanged):
 * - All UI components and styling
 * - Header card design and Stack screen configuration
 * - Empty state handling and ScrollView with RefreshControl
 * - Event rendering with Event component
 * - Navigation logic and error handling UI
 * - Load more functionality and refresh control
 * 
 * BENEFITS:
 * - Single event store reduces memory usage
 * - Direct cache updates improve performance
 * - Simplified query key management
 * - Better consistency across the app
 * - Reduced cache invalidation complexity
 * - Unified event data handling
 * 
 * OLD INTERFACE:
 * useInfiniteEventsQuery({
 *   eventType: 'nearby',
 *   latitude, longitude, distance: distanceValue,
 *   pageSize: 6, enabled: Boolean(latitude && longitude)
 * })
 * 
 * NEW INTERFACE:
 * useInfiniteNearbyEvents(latitude, longitude, distanceValue, 6)
 */