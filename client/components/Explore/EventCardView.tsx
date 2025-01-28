import React from 'react';
import { View, Text, ImageBackground, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { BlurView } from 'expo-blur';

interface SuggestedEventProps {
  title: string;
  location: string;
  date: string;
  time: string;
  imageUrl: any;
}

const EventCardView: React.FC<SuggestedEventProps> = ({
  title,
  location,
  date,
  time,
  imageUrl,
}) => {
  const screenWidth = Dimensions.get('window').width;

  const colorScheme = useColorScheme();

  return (
    <ThemedView
      className='flex-1 w-full items-center justify-center'
      style={{
        width: screenWidth * 0.9,
        borderRadius: 16, // Match the rounded corners of the child
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0.5, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        alignSelf: 'center', // Center horizontally
        marginVertical: 8,
      }}
    >
      {/* Inner Container with Rounded Corners */}
      <ThemedView
        className="flex-1 overflow-hidden rounded-sm"
        style={{
          borderRadius: 16, // Rounded corners
          aspectRatio: 1.7,
          width: '100%'
        }}
      >
        {/* Event Image */}
        <ImageBackground
          source={imageUrl}
          resizeMode="cover"
          className="flex w-full h-full"
        />

        {/* Event Details */}
        <ThemedView className="absolute bottom-0 w-full py-2 px-3" style={{ height: '30%' }}>
          <ThemedText className="text-xs font-bold mb-1">{title}</ThemedText>
          <ThemedView className="flex-row items-center mb-1">
            <Feather name="map-pin" size={10} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText className="text-xs ml-2">{location}</ThemedText>
          </ThemedView>
          <ThemedView className="flex-row items-center">
            <Feather name="clock" size={10} color={Colors[colorScheme ?? 'dark'].tint} />
            <ThemedText className="text-xs ml-2">
              {date} • {time}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
};

export default EventCardView;