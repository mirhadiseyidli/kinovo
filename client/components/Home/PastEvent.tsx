import React from 'react';
import { View, Text, ImageBackground, Image } from 'react-native';
import { BlurView } from 'expo-blur'; // Add expo-blur for the blur effect
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';

interface PastEventProps {
  title: string;
  date: string;
  attendees: any[];
  image: any;
}

const PastEvent: React.FC<PastEventProps> = ({ title, date, attendees, image }) => {
  const colorScheme = useColorScheme(); // Get current color scheme

  // Background color based on theme
  const backgroundColor =
    colorScheme === 'dark'
      ? 'rgba(50, 50, 50, 0.7)' // Whitish gray for dark mode
      : 'rgba(200, 200, 200, 0.7)'; // Darkish gray for light mode

  return (
    <ImageBackground
      source={image}
      resizeMode="cover"
      className="w-full h-40 rounded-lg mb-4"
      style={{
        overflow: 'hidden',
      }}
    >
      {/* Blurry Tint Overlay */}
      <BlurView
        intensity={50}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        className="absolute bottom-0 w-full flex-row justify-between items-center py-2 px-4 rounded-b-lg"
        style={{ backgroundColor }}
      >
        {/* Event Info */}
        <View className="flex-1">
          <ThemedText className="text-sm font-bold text-white">{title}</ThemedText>
          <ThemedText className="text-xs text-gray-300">{date}</ThemedText>
        </View>

        {/* Attendees */}
        <View className="flex-row items-center ml-4">
          {attendees.slice(0, 4).map((attendee, index) => (
            <Image
              key={index}
              source={attendee}
              className={`w-8 h-8 rounded-full ${index > 0 ? '-ml-2' : ''}`}
              resizeMode="cover"
            />
          ))}
          {attendees.length > 4 && (
            <View className="w-8 h-8 rounded-full bg-white -ml-2 items-center justify-center">
              <Text className="text-sm text-gray-800">+{attendees.length - 4}</Text>
            </View>
          )}
        </View>
      </BlurView>
    </ImageBackground>
  );
};

export default PastEvent;