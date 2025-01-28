import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PastEvent from '@/components/Home/PastEvent';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const pastEventData = [
  {
    id: 1,
    title: 'Tech Conference',
    date: '2024-12-15',
    attendees: [require('@/assets/profile-pic-1.webp'), require('@/assets/profile-pic-2.jpeg')],
    image: require('@/assets/soccer-field.jpg'),
  },
  {
    id: 2,
    title: 'Summer Festival',
    date: '2024-08-20',
    attendees: [
      require('@/assets/profile-pic-1.webp'),
      require('@/assets/profile-pic-2.jpeg'),
      require('@/assets/profile-pic-1.webp'),
    ],
    image: require('@/assets/hiking-place.jpg'),
  },
  {
    id: 3,
    title: 'Startup Meetup',
    date: '2024-07-05',
    attendees: [require('@/assets/profile-pic-1.webp')],
    image: require('@/assets/conference-room.webp'),
  },
  {
    id: 4,
    title: 'Art Exhibition',
    date: '2024-06-30',
    attendees: [require('@/assets/profile-pic-2.jpeg')],
    image: require('@/assets/tennis-court.jpg'),
  },
  {
    id: 5,
    title: 'Tech Conference',
    date: '2024-06-15',
    attendees: [require('@/assets/profile-pic-1.webp'), require('@/assets/profile-pic-2.jpeg')],
    image: require('@/assets/soccer-field.jpg'),
  },
];

const groupEventsByMonth = (events: any[]) => {
  const grouped: { [key: string]: any[] } = {};
  const now = new Date();

  events.forEach((event) => {
    const eventDate = new Date(event.date);
    const monthName =
      eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth()
        ? 'This Month'
        : eventDate.getFullYear() === now.getFullYear() &&
          eventDate.getMonth() === now.getMonth() - 1
        ? 'Last Month'
        : eventDate.toLocaleString('default', { month: 'long' });

    if (!grouped[monthName]) grouped[monthName] = [];
    grouped[monthName].push(event);
  });

  return grouped;
};

const PastEvents: React.FC = () => {
  const colorScheme = useColorScheme();
  const groupedEvents = groupEventsByMonth(pastEventData);
  const tabBarHeight = useBottomTabBarHeight(); // Get the tab bar height dynamically

  return (
    <ScrollView 
      className="p-4 w-full"
      contentContainerStyle={{
        paddingBottom: tabBarHeight / 1.5, // Add padding equal to the tab bar height
      }}  
    >
      {/* Header Section */}
      <View className="flex-row justify-between items-center mb-4">
        <ThemedText className="text-md font-bold">Event History</ThemedText>
        <TouchableOpacity className="flex-row items-center">
          <ThemedText className="text-sm font-bold text-[#4FB9AF] mr-2">Filter</ThemedText>
          <Feather name="filter" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
        </TouchableOpacity>
      </View>

      {/* Events Grouped by Month */}
      {Object.entries(groupedEvents).map(([month, events]) => (
        <View key={month}>
          <ThemedText className="text-sm font-bold text-white mb-4">{month}</ThemedText>
          {events.map((event) => (
            <PastEvent
              key={event.id}
              title={event.title}
              date={event.date}
              attendees={event.attendees}
              image={event.image}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

export default PastEvents;