import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import PastEvent from '@/components/Home/PastEvent';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const pastEventData = [
  {
    id: 1,
    title: 'Tech Conference',
    date: '2024-12-15',
    attendees: [
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') }
    ],
    image: require('@/assets/soccer-field.jpg'),
  },
  {
    id: 2,
    title: 'Summer Festival',
    date: '2024-08-20',
    attendees: [
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') }
    ],
    image: require('@/assets/hiking-place.jpg'),
  },
  {
    id: 3,
    title: 'Startup Meetup',
    date: '2024-07-05',
    attendees: [
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') },
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') },
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') }
    ],
    image: require('@/assets/conference-room.webp'),
  },
  {
    id: 4,
    title: 'Art Exhibition',
    date: '2024-06-30',
    attendees: [
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') }
    ],
    image: require('@/assets/tennis-court.jpg'),
  },
  {
    id: 5,
    title: 'Tech Conference',
    date: '2024-06-15',
    attendees: [
      { name: 'Emma', image: require('@/assets/profile-pic-1.webp') },
      { name: 'Mike', image: require('@/assets/profile-pic-2.jpeg') }
    ],
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
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight / 1.5, // Add padding equal to the tab bar height
        }}
      >
        {/* Header Section */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
            Event History
          </ThemedText>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 14, marginRight: 8 }}>Filter</ThemedText>
            <Feather name="filter" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
          </TouchableOpacity>
        </View>

        {/* Events Grouped by Month */}
        <View style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groupedEvents).map(([month, events]) => (
            <View key={month} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ThemedText style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                {month}
              </ThemedText>

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
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default PastEvents;