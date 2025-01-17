import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface UpcomingEventProps {
  title: string;
  date: string;
  time: string;
}

const UpcomingEvent: React.FC<UpcomingEventProps> = ({ title, date, time }) => {
  return (
    <View className="flex-row items-center mb-4">
      {/* Event Icon */}
      <View className="w-8 h-8 justify-center items-center mr-4">
        <Feather name="calendar" size={20} color="#0d9488" />
      </View>

      {/* Event Details */}
      <View>
        <Text className="text-base font-bold">{title}</Text>
        <Text className="text-gray-500">{`${date} at ${time}`}</Text>
      </View>
    </View>
  );
};

export default UpcomingEvent;