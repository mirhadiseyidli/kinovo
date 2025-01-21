import React from 'react';
import { View, Text, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

interface SuggestedEventProps {
  title: string;
  location: string;
  date: string;
  time: string;
  imageUrl: any;
}

const SuggestedEvent: React.FC<SuggestedEventProps> = ({
  title,
  location,
  date,
  time,
  imageUrl,
}) => {
  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView
      style={{
        width: screenWidth * 0.9,
        borderRadius: 16, // Match the rounded corners of the child
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        backgroundColor: 'transparent', // Make sure the shadow is visible
        alignSelf: 'center', // Center horizontally
        marginVertical: 8,
      }}
    >
      {/* Inner Container with Rounded Corners */}
      <ThemedView
        className="bg-white border border-gray-100 overflow-hidden rounded-xl"
        style={{
          borderRadius: 16, // Rounded corners
        }}
      >
        {/* Event Image */}
        <Image
          source={imageUrl}
          className="w-full h-40"
        />

        {/* Event Details */}
        <ThemedView className="p-4">
          <ThemedText className="text-lg font-bold text-gray-900 mb-2">{title}</ThemedText>
          <ThemedView className="flex-row items-center mb-1">
            <Feather name="map-pin" size={16} color="#6B7280" />
            <ThemedText className="text-sm text-gray-500 ml-2">{location}</ThemedText>
          </ThemedView>
          <ThemedView className="flex-row items-center">
            <Feather name="clock" size={16} color="#6B7280" />
            <ThemedText className="text-sm text-gray-500 ml-2">
              {date} • {time}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default SuggestedEvent;