import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Event from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface EventSuggestionsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const friendImage1 = require('@/assets/profile-pic-1.webp');
const eventImage1 = require('@/assets/soccer-field.jpg');
const friendImage2 = require('@/assets/profile-pic-2.jpeg');
const eventImage2 = require('@/assets/tennis-court.jpg');

const EventSuggestions: React.FC<EventSuggestionsProps> = ({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const loading = false;
  const events = [
    {
      id: 1,
      friendName: 'John Smith',
      friendImage: friendImage1,
      eventTitle: 'Web3 Workshop',
      date: 'Tomorrow',
      time: '2:00 PM',
      location: 'Tech Hub, Silicon Valley',
      remainingDays: 'in 1 day',
      event_picture: eventImage1,
    },
    {
      id: 2,
      friendName: 'Sarah Wilson',
      friendImage: friendImage2,
      eventTitle: 'Jazz Night',
      date: 'Sat',
      time: '8:00 PM',
      location: 'Blue Note Jazz Club',
      remainingDays: 'in 3 days',
      event_picture: eventImage2,
    },
    {
      id: 3,
      friendName: 'Michael Brown',
      friendImage: friendImage1,
      eventTitle: 'Tech Meetup',
      date: 'Sun',
      time: '5:00 PM',
      location: 'Downtown Center',
      remainingDays: 'in 4 days',
      event_picture: eventImage1,
    },
    {
      id: 4,
      friendName: 'Emily Davis',
      friendImage: friendImage2,
      eventTitle: 'Art Exhibition',
      date: 'Mon',
      time: '6:00 PM',
      location: 'Art Hub',
      remainingDays: 'in 5 days',
      event_picture: eventImage2,
    },
    {
      id: 5,
      friendName: 'John Smith',
      friendImage: friendImage1,
      eventTitle: 'Web3 Workshop',
      date: 'Tomorrow',
      time: '2:00 PM',
      location: 'Tech Hub, Silicon Valley',
      remainingDays: 'in 1 day',
      event_picture: eventImage1,
    },
    {
      id: 6,
      friendName: 'Sarah Wilson',
      friendImage: friendImage2,
      eventTitle: 'Jazz Night',
      date: 'Sat',
      time: '8:00 PM',
      location: 'Blue Note Jazz Club',
      remainingDays: 'in 3 days',
      event_picture: eventImage2,
    },
    {
      id: 7,
      friendName: 'Michael Brown',
      friendImage: friendImage1,
      eventTitle: 'Tech Meetup',
      date: 'Sun',
      time: '5:00 PM',
      location: 'Downtown Center',
      remainingDays: 'in 4 days',
      event_picture: eventImage1,
    },
    {
      id: 8,
      friendName: 'Emily Davis',
      friendImage: friendImage2,
      eventTitle: 'Art Exhibition',
      date: 'Mon',
      time: '6:00 PM',
      location: 'Art Hub',
      remainingDays: 'in 5 days',
      event_picture: eventImage2,
    },
    {
      id: 9,
      friendName: 'John Smith',
      friendImage: friendImage1,
      eventTitle: 'Web3 Workshop',
      date: 'Tomorrow',
      time: '2:00 PM',
      location: 'Tech Hub, Silicon Valley',
      remainingDays: 'in 1 day',
      event_picture: eventImage1,
    },
    {
      id: 10,
      friendName: 'Sarah Wilson',
      friendImage: friendImage2,
      eventTitle: 'Jazz Night',
      date: 'Sat',
      time: '8:00 PM',
      location: 'Blue Note Jazz Club',
      remainingDays: 'in 3 days',
      event_picture: eventImage2,
    },
    {
      id: 11,
      friendName: 'Michael Brown',
      friendImage: friendImage1,
      eventTitle: 'Tech Meetup',
      date: 'Sun',
      time: '5:00 PM',
      location: 'Downtown Center',
      remainingDays: 'in 4 days',
      event_picture: eventImage1,
    },
    {
      id: 12,
      friendName: 'Emily Davis',
      friendImage: friendImage2,
      eventTitle: 'Art Exhibition',
      date: 'Mon',
      time: '6:00 PM',
      location: 'Art Hub',
      remainingDays: 'in 5 days',
      event_picture: eventImage2,
    },
  ];

  useEffect(() => {
    if (refreshing) {
      // TODO: Add actual data fetching here
      onFinishRefresh();
    }
  }, [refreshing]);

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Events You Might Like</ThemedText>
      </ThemedView>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        {events.map((event, index) => (
          <View key={event.id}>
            <Event
              event={event}
              loading={loading}
            />
            {/* Divider Line */}
            {index < events.length - 1 && (
              <View
                style={{
                  height: 0.3,
                  backgroundColor: Colors[colorScheme ?? 'dark'].border,
                  marginVertical: 16,
                }}
              />
            )}
          </View>
        ))}
      </View>
    </ThemedView>
  );
};

export default EventSuggestions;