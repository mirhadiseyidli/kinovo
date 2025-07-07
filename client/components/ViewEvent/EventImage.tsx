import React from 'react';
import { View } from 'react-native';
import { OptimizedCDNImage } from '@/components/OptimizedCDNImage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface EventImageProps {
  event_picture: string | null;
  category?: string | null;
  width?: number;
  height?: number;
}

const EventImage = ({ event_picture, category, width = 200, height = 200 }: EventImageProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  return (
    <View style={{ width: '60%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
      <OptimizedCDNImage
        source={event_picture}
        fallbackCategory={category}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: 16
        }}
        resizeMode="cover"
        width={width}
        height={height}
        quality={85}
        priority="high"
        enableBlurUp={true}
      />
    </View>
  );
};

export default EventImage;