import React from 'react';
import { View, ScrollView, ImageBackground } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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

  // This will be replaced with actual data fetching
  const eventsCount = 3;
  const loading = false;

  return (
    <ScrollView style={{ flex: 1 }}>
      {/* Header Image with Gradient Overlay */}
      <View style={{ height: 300 }}>
        <ImageBackground
          source={cityImages[city as string] || require('@/assets/event-default.png')}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              padding: 24,
              justifyContent: 'flex-end',
            }}
          >
            <ThemedText style={{ fontSize: 40, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
              {city}
            </ThemedText>
            <ThemedText style={{ fontSize: 24, color: 'white', marginBottom: 8 }}>
              California
            </ThemedText>
            <ThemedText style={{ fontSize: 16, color: 'white', opacity: 0.9 }}>
              {cityDescriptions[city as string] || 'Discover amazing events in this city'}
            </ThemedText>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* Events Section */}
      <ThemedView style={{ padding: 16 }}>
        <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold' }}>
            Events in {city}
          </ThemedText>
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {eventsCount} events
          </ThemedText>
        </ThemedView>

        {/* Events List */}
        <ThemedView style={{ gap: 16 }}>
          {/* This will be replaced with actual events data */}
          {[1, 2, 3].map((_, index) => (
            <Event
              key={index}
              event={{
                title: "Sample Event",
                location: { 
                  text: "Sample Location",
                  city: city as string,
                  state: "California",
                  coordinates: { lat: null, lng: null }
                },
                start_time: new Date(),
                end_time: new Date(),
                category: "Outdoor",
                visibility: "public",
                creator: { 
                  _id: "sample",
                  first_name: "John",
                  last_name: "Doe",
                  username: "johndoe",
                  full_name: "John Doe",
                  profile_picture: undefined,
                  email: "john@example.com",
                  created_at: new Date(),
                  email_verified: false,
                  phone_number: {
                    country_code: null,
                    area_code: null,
                    phone_num: null,
                    full_num: null
                  },
                  mutualFriendsCount: 0
                },
                status: "upcoming"
              }}
              loading={loading}
            />
          ))}
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
};

export default CityPage; 