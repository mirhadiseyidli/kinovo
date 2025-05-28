import React from 'react';
import { View, ScrollView, ImageBackground } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Event from '@/components/Event';
import { useLocalSearchParams } from 'expo-router';

const CategoryPage = () => {
  const { category } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // This will be replaced with actual data fetching
  const eventsCount = 3;
  const loading = false;

  // Emoji mapping for categories
  const categoryEmoji: { [key: string]: string } = {
    'Sports': '🏃',
    'Music': '🎵',
    'Outdoor': '🏞️',
    'Art': '🎨',
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Header Card */}
      <ThemedView 
        style={{ 
          backgroundColor: category === 'Sports' ? '#34D399' : 
                          category === 'Music' ? '#8B5CF6' : 
                          category === 'Outdoor' ? '#60A5FA' : 
                          '#EC4899',
          padding: 16,
          borderRadius: 24,
        }}
      >
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <ThemedText style={{ fontSize: 48, marginBottom: 8 }}>
            {categoryEmoji[category as string] || '🎉'}
          </ThemedText>
          <ThemedText style={{ fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>
            {category} Events
          </ThemedText>
          <ThemedText style={{ fontSize: 18, color: 'white', opacity: 0.9 }}>
            {eventsCount} events found
          </ThemedText>
        </View>
      </ThemedView>

      {/* Events Section */}
      <ThemedView style={{ paddingVertical: 16 }}>
        <ThemedView style={{ marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold' }}>
            Upcoming Events
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
                  city: "San Francisco",
                  state: "California",
                  coordinates: { lat: null, lng: null }
                },
                start_time: new Date(),
                end_time: new Date(),
                category: category as string,
                visibility: "public",
                creator: { 
                  _id: "sample",
                  first_name: "John",
                  last_name: "Doe",
                  username: "johndoe",
                  full_name: "John Doe",
                  email: "john@example.com",
                  email_verified: false,
                  phone_number: {
                    country_code: null,
                    area_code: null,
                    phone_num: null,
                    full_num: null
                  },
                  created_at: new Date(),
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

export default CategoryPage; 