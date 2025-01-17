import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import UpcomingEvent from './UpcomingEvent';

const UpcomingEvents: React.FC = () => {
  const events = [
    {
      id: 1,
      title: 'Morning Yoga in the Park',
      date: '7/14/2023',
      time: '09:00 AM',
    },
    {
      id: 2,
      title: 'Local Football Match',
      date: '7/15/2023',
      time: '02:00 PM',
    },
    {
      id: 3,
      title: 'Evening Run Group',
      date: '7/17/2023',
      time: '07:00 PM',
    },
    {
      id: 4,
      title: 'Mountain Biking Adventure',
      date: '7/19/2023',
      time: '10:00 AM',
    },
    {
      id: 5,
      title: 'Community Garden Meetup',
      date: '7/21/2023',
      time: '03:00 PM',
    },
  ];

  return (
    <View className="bg-white w-full p-4">
      {/* Header */}
      <Text className="text-lg font-bold mb-4">Upcoming Events</Text>

      {/* Event List */}
      <ScrollView>
        {events.map((event) => (
          <UpcomingEvent
            key={event.id}
            title={event.title}
            date={event.date}
            time={event.time}
          />
        ))}
      </ScrollView>

      {/* View Calendar Button */}
      <TouchableOpacity className="mt-4 bg-teal-500 rounded-lg p-3">
        <Text className="text-white text-center font-bold">View Calendar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UpcomingEvents;