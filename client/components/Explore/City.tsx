import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface CityProps {
  name: string;
  image: any; // Use ImageSourcePropType if using local images
}

const City: React.FC<CityProps> = ({ name, image }) => {
  const colorScheme = useColorScheme();

  const backgroundColor =
    colorScheme === 'dark'
      ? 'rgba(50, 50, 50, 0.7)' // Whitish gray for dark mode
      : 'rgba(200, 200, 200, 0.7)'; // Darkish gray for light mode

  return (
    <ThemedView 
      className="flex-1 w-full items-center justify-center"
      style={{
        borderRadius: 16, // Match the rounded corners of the child
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        alignSelf: 'center', // Center horizontally
        marginVertical: 8,
      }}
    >
      <ThemedView
        className="flex-1 overflow-hidden rounded-sm"
        style={{
          borderRadius: 16, // Rounded corners
          aspectRatio: 1,
          width: '90%'
        }}
      >
        <ImageBackground
          source={image}
          resizeMode="cover"
          className="flex w-full h-full"
        >
          <BlurView
            intensity={50}
            className="absolute bottom-0 w-full py-2 px-3"
            style={{ backgroundColor }}
          >
            <ThemedText className="text-white text-sm font-bold">{name}</ThemedText>
          </BlurView>
        </ImageBackground>
      </ThemedView>
    </ThemedView>
  );
};

export default City;