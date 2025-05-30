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

const cityImages: { [key: string]: any } = {
  'San Francisco': require('@/assets/san-francisco.avif'),
  'New York': require('@/assets/new-york.webp'),
  'Los Angeles': require('@/assets/los-angeles.webp'),
  'Chicago': require('@/assets/chicago.jpg'),
};

const cityDescriptions: { [key: string]: string } = {
  'San Francisco': 'Discover amazing events in the City by the Bay',
  'New York': 'Experience the city that never sleeps',
  'Los Angeles': 'Find exciting events in the City of Angels',
  'Chicago': 'Explore events in the Windy City',
};

const CityPage = () => {
  const { city } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchEventsByCity = async () => {
    try {
      console.log('Fetching events for city:', city);
      const response = await api.get(`/api/manageevents/eventslist/city/${encodeURIComponent(city as string)}`);
      console.log('Response data:', response.data);
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
      }
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      await fetchEventsByCity();
      setLoading(false);
    };
    loadEvents();
  }, [city]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEventsByCity();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeColors.text}
        />
      }
    >
      {/* Header Image with Gradient Overlay */}
      <View style={{ height: 300 }}>
        <ImageBackground
          source={cityImages[city as string] || require('@/assets/event-default.png')}
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
              California
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: 'white', opacity: 0.9 }}>
              {cityDescriptions[city as string] || 'Discover amazing events in this city'}
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
            {events.length} events
          </ThemedText>
        </ThemedView>

        {/* Events List */}
        <ThemedView style={{ gap: 16 }}>
          {loading ? (
            <ActivityIndicator size="large" color={themeColors.tint} />
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
                No events in {city} yet
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                Tap here to create the first event in {city}! 🎉
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export default CityPage; 