import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface ActivityProps {
  friendName: string;
  friendImage: any;
  activityTitle: string;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
}

const Activity: React.FC<ActivityProps> = ({
  friendName,
  friendImage,
  activityTitle,
  eventTitle,
  date,
  time,
  location,
}) => {
  return (
    <ThemedView
      style={{
        marginBottom: 16, // Spacing between activities
        alignSelf: 'center', // Center content horizontally
        width: '100%', // Full width
      }}
    >
      {/* Friend Information */}
      <ThemedView className="flex-row items-center mb-2">
        <Image
          source={ friendImage }
          className="w-10 h-10 rounded-full mr-3"
        />
        <ThemedView>
          <ThemedText className="font-bold text-gray-900">{friendName}</ThemedText>
          <ThemedText className="text-gray-500 text-sm">{activityTitle}</ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Event Card */}
      <ThemedView
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2, // For Android
          backgroundColor: 'transparent', // Ensure shadow is visible
          borderRadius: 12, // Match rounded corners of the child
        }}
      >
        <ThemedView className="bg-white rounded-lg border border-gray-100 p-4">
          <ThemedText className="font-bold text-gray-900 mb-2">{eventTitle}</ThemedText>
          <ThemedView className="flex-row items-center mb-1">
            <Feather name="map-pin" size={16} color="#6B7280" />
            <ThemedText className="text-sm text-gray-500 ml-2">{location}</ThemedText>
          </ThemedView>
          <ThemedView className="flex-row items-center">
            <Feather name="clock" size={16} color="#6B7280" />
            <ThemedText className="text-sm text-gray-500 ml-2">
              {date}, {time}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default Activity;