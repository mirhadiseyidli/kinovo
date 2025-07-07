import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CityProps } from '@/types/allTypes';
import { OptimizedCDNImage } from '@/components/OptimizedCDNImage';

const CITY_SIZE = 180;

const City: React.FC<CityProps> = ({ name, image, onPress }) => {
  const colorScheme = useColorScheme();

  const backgroundColor =
    colorScheme === 'dark'
      ? 'rgba(50, 50, 50, 0.7)' // Whitish gray for dark mode
      : 'rgba(200, 200, 200, 0.7)'; // Darkish gray for light mode

  return (
    <TouchableOpacity
      style={{
        width: CITY_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16, // Match the rounded corners of the child
        shadowColor: Colors[colorScheme ?? 'dark'].tint,
        shadowOffset: { width: 0, height: 0.5 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2, // For Android
        backgroundColor: 'transparent',
        alignSelf: 'stretch',
        marginVertical: 8,
      }}
      onPress={onPress}
    >
      <ThemedView
        style={{
          overflow: 'hidden',
          borderRadius: 16, // Rounded corners
          width: CITY_SIZE,
          height: CITY_SIZE,
        }}
      >
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <OptimizedCDNImage
            source={image?.uri || image} // Support both CDN URLs and require() images
            style={{
              width: '100%',
              height: '100%',
            }}
            containerStyle={{
              flex: 1,
              width: '100%',
              height: '100%',
            }}
            resizeMode="cover"
            quality={80}
            width={CITY_SIZE}
            height={CITY_SIZE}
          />
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
        </View>
      </ThemedView>
    </TouchableOpacity>
  );
};

export default City;