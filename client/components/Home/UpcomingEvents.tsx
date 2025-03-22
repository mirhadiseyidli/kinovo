import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Event from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const friendImage1 = require('@/assets/profile-pic-1.webp');
const eventImage1 = require('@/assets/soccer-field.jpg');
const friendImage2 = require('@/assets/profile-pic-2.jpeg');
const eventImage2 = require('@/assets/tennis-court.jpg');

const UpcomingEvents: React.FC = () => {
  const colorScheme = useColorScheme();
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
      eventImage: eventImage1,
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
      eventImage: eventImage2,
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
      eventImage: eventImage1,
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
      eventImage: eventImage2,
    },
  ];

  // Limit the number of displayed events to 3
  const limitedEvents = events.slice(0, 3);

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Upcoming Events</ThemedText>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View Calendar</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {limitedEvents.map((event, index) => (
            <View key={event.id}>
              <Event
                friendName={event.friendName}
                friendImage={event.friendImage}
                eventTitle={event.eventTitle}
                date={event.date}
                time={event.time}
                location={event.location}
                remainingDays={event.remainingDays}
                eventImage={event.eventImage}
              />
              {/* Divider Line */}
              {index < limitedEvents.length - 1 && (
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
        </ScrollView>
      </View>
    </ThemedView>
  );
};

export default UpcomingEvents;
