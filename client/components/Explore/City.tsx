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
      style={{
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
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
        style={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 16, // Rounded corners
          aspectRatio: 1,
          width: '90%',
        }}
      >
        <ImageBackground
          source={image}
          resizeMode="cover"
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
          }}
        >
          <BlurView
            intensity={50}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor,
            }}
          >
            <ThemedText style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
              {name}
            </ThemedText>
          </BlurView>
        </ImageBackground>
      </ThemedView>
    </ThemedView>
  );
};

export default City;