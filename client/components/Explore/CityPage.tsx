import React, { useState, useEffect } from 'react';
import { View, ScrollView, ImageBackground, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/utils/api';
import type { Event as EventType } from '@/types/allTypes';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { EventCardSkeleton } from '@/components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { getCityByName, getStateByCity, getCityDescription } from '@/constants/Cities';

const CityPage = () => {
  const { city } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const router = useRouter();

  // Get city info from constants
  const cityInfo = getCityByName(city as string);
  const stateName = getStateByCity(city as string);
  const cityDescription = getCityDescription(city as string);

  const fetchEventsByCity = async () => {
    try {
      const response = await api.get(`/api/manageevents/eventslist/city/${encodeURIComponent(city as string)}`);
      if (Array.isArray(response.data)) {
        setEvents(response.data);
        setHasError(false); // Clear error state on successful fetch
      } else {
        console.error('Unexpected response format:', response.data);
        setEvents([]);
        setHasError(true);
      }
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
      }
      setEvents([]);
      setHasError(true);
      throw err; // Re-throw to be handled by caller
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setHasError(false);
    try {
      await fetchEventsByCity();
      setLoading(false); // Set loading to false on success
    } catch (error) {
      // On error, only set loading to false if we have existing data to show
      if (events.length > 0) {
        setLoading(false);
      }
      // If no existing data, keep loading true to show skeleton
    }
  };

  useEffect(() => {
    loadEvents();
  }, [city]);

  // Auto-recovery when screen comes into focus (for server reconnection scenarios)
  useFocusEffect(
    React.useCallback(() => {
      // Only attempt recovery if we have an error and no data
      if (hasError && events.length === 0 && !refreshing) {
        loadEvents();
      }
    }, [hasError, events.length, refreshing])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchEventsByCity();
    } catch (error) {
      // Error handled in fetchEventsByCity
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={themeColors.mountainGreen}
          colors={[themeColors.mountainGreen]}
        />
      }
    >
      {/* Header Image with Gradient Overlay */}
      <View style={{ height: 300 }}>
        <ImageBackground
          source={cityInfo?.image || require('@/assets/event-default.png')}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)', themeColors.background]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              paddingHorizontal: 16,
              paddingBottom: 16,
              justifyContent: 'flex-end',
            }}
            locations={[0, 0.7, 1]}
          >
            <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
              {city}
            </ThemedText>
            <ThemedText style={{ fontSize: 16, color: 'white', marginBottom: 8 }}>
              {stateName || 'Unknown State'}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: 'white', opacity: 0.9 }}>
              {cityDescription}
            </ThemedText>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Events Section */}
      <ThemedView style={{ padding: 16 }}>
        <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
            Events in {city}
          </ThemedText>
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {loading && events.length === 0 ? '...' : `${events.length} events`}
          </ThemedText>
        </ThemedView>

        {/* Events List */}
        <ThemedView style={{ gap: 16 }}>
          {(loading && events.length === 0) || refreshing ? (
            <EventCardSkeleton count={3} />
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
              }}
            >
              <View style={{ marginBottom: 12 }}>
                <IconSymbol
                  name="calendar"
                  size={32}
                  color={themeColors.placeholderTextColor}
                />
              </View>
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  marginBottom: 4,
                  fontWeight: '600'
                }}
              >
                {hasError ? 'Unable to load events' : `No events in ${city} yet`}
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                {hasError ? 'Pull to refresh or check your connection' : `Tap here to create the first event in ${city}!`}
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export default CityPage; 