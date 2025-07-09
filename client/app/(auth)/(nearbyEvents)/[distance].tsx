import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { usePaginatedNearbyEvents } from '@/hooks/usePaginatedNearbyEvents';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EventCardSkeleton } from '@/components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

const NearbyEventsPage = () => {
  const { distance, lat, lng, city, state } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    events,
    loading,
    loadingMore,
    hasMore,
    error,
    isFirstFetch,
    fetchNearbyEvents,
    loadMore,
    refresh,
    reset
  } = usePaginatedNearbyEvents();

  // Parse location parameters
  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const distanceValue = parseInt(distance as string);

  const loadEvents = useCallback(async () => {
    if (latitude && longitude) {
      await fetchNearbyEvents(latitude, longitude, distanceValue, 0, false);
    }
  }, [latitude, longitude, distanceValue, fetchNearbyEvents]);

  useEffect(() => {
    reset();
    loadEvents();
  }, [distance, lat, lng]);

  // Auto-recovery when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (error && events.length === 0 && !refreshing) {
        loadEvents();
      }
    }, [error, events.length, refreshing, loadEvents])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh(latitude, longitude, distanceValue);
    } catch (error) {
      console.error('Error refreshing nearby events:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (hasMore && !loadingMore && latitude && longitude) {
      await loadMore(latitude, longitude, distanceValue);
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
            {isFirstFetch ? '...' : `${events.length} events`}
          </ThemedText>
        </ThemedView>

        {/* Events List */}
        <ThemedView style={{ gap: 16 }}>
          {isFirstFetch && loading ? (
            <EventCardSkeleton count={1} />
          ) : events.length > 0 ? (
            events.map((event) => (
              <Event
                key={event._id}
                event={event}
                loading={false}
              />
            ))
          ) : (
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
          {loadingMore && (
            <ThemedView style={{ 
              padding: 20, 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <ActivityIndicator size="small" color={themeColors.mountainGreen} />
              <ThemedText style={{ 
                marginTop: 8, 
                color: themeColors.textSecondary,
                fontSize: 14
              }}>
                Loading more events...
              </ThemedText>
            </ThemedView>
          )}

          {/* End of list indicator */}
          {!hasMore && events.length > 0 && !loading && (
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
            </ThemedView>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
    </ThemedView>
  );
};

export default NearbyEventsPage; 