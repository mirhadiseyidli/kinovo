import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { getCategoryImage } from '@/constants/CategoryImages';
import { Image } from 'expo-image';

interface EventImageProps {
  eventType?: string | null;
  width?: number;
  height?: number;
}

const EventImage: React.FC<EventImageProps> = ({ eventType, width = 200, height = 200 }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ 
      width: '60%', 
      aspectRatio: 1, 
      borderRadius: 16, 
      overflow: 'hidden' 
    }}>
      <Image
        source={getCategoryImage(eventType)}
        style={{ width: '100%', height: '100%', borderRadius: 16 }}
        contentFit="cover"
      />
    </View>
  );
};

export default EventImage;