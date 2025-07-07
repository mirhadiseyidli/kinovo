import React, { useEffect, useState } from 'react';
import { View, ScrollView, ImageBackground, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryIcon, getCategoryColor } from '@/utils/categoryIcons';
import api from '@/utils/api';
import type { Event as EventType } from '@/types/allTypes';
import { IconSymbol } from '@/components/ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventCardSkeleton } from '@/components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';

const CategoryPage = () => {
  const { category } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const response = await api.get(`/api/manageevents/eventslist/category/${encodeURIComponent(category as string)}`);
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
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setHasError(false);
    try {
      await fetchEvents();
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
    } catch (error) {
      // On error, only set loading to false if we have existing data to show
      if (events.length > 0) {
        setLoading(false);
      }
      // If no existing data, keep loading true to show skeleton
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [category]);

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
      await fetchEvents();
    } catch (error) {
      // Error handled in fetchEvents
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToCreateEvent = async () => {
    // Store the selected category in AsyncStorage
    if (category) {
      try {
        // Set a flag to indicate we're coming from a category page
        await AsyncStorage.setItem('selectedCategory', category as string);
      } catch (error) {
        console.error('Error setting selected category:', error);
      }
    }
    
    // Navigate to the create event screen
    router.push('/(auth)/(createEvent)/EventDetails');
  };

  return (
    <ScrollView 
      style={{ flex: 1, padding: 16 }}
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
          backgroundColor: getCategoryColor(category as string),
          padding: 16,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16
        }}
      >
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <MaterialCommunityIcons 
            name={getCategoryIcon(category as string)} 
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
            {category} Events
          </ThemedText>
        </View>
      </ThemedView>

      {/* Events Section */}
      <ThemedView style={{ paddingVertical: 16 }}>
        <ThemedView style={{ 
          marginBottom: 24,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
            Upcoming Events
          </ThemedText>
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {isFirstFetch ? '...' : `${events.length} events`}
          </ThemedText>
        </ThemedView>

        {/* Events List */}
        <ThemedView style={{ gap: 16 }}>
          {isFirstFetch ? (
            <EventCardSkeleton count={1} />
          ) : events.length > 0 ? (
            events.map((event) => (
              <Event
                key={event._id}
                event={event}
                loading={false}
              />
            ))
          ) :
            <TouchableOpacity
              onPress={navigateToCreateEvent}
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
                {hasError ? 'Unable to load events' : 'No events in this category yet'}
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                {hasError ? 'Pull to refresh or check your connection' : `Tap here to create the first ${category} event!`}
              </ThemedText>
            </TouchableOpacity>
          }
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export default CategoryPage; 