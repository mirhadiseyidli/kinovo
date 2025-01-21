import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import UpcomingEvent from './UpcomingEvent';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const friendImage1 = require('../assets/profile-pic-1.webp');
const eventImage1 = require('../assets/soccer-field.jpg');
const friendImage2 = require('../assets/profile-pic-2.jpeg');
const eventImage2 = require('../assets/tennis-court.jpg');

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
    <ThemedView className="flex-1 w-full p-4">
      {/* Header */}
      <ThemedView className="flex-row justify-between items-center mb-6">
        <ThemedText className="text-md font-bold">Upcoming Events</ThemedText>
        <TouchableOpacity className="flex-row items-center">
          <ThemedText className="text-md">View Calendar</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </ThemedView>

      {/* Event List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {limitedEvents.map((event, index) => (
          <View 
            key={event.id} 
            className='flex flex-shrink'
            style={{ marginBottom: index < limitedEvents.length - 1 ? 16 : 0 }}
          >
            <UpcomingEvent
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
            {index < 2 && (
              <View className="border-b border-gray-300" />
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
};

export default UpcomingEvents;