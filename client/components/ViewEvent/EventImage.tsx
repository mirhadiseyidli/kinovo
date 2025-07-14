import React from 'react';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { SkeletonBox } from '../Skeleton';
import { Image } from 'expo-image';
import { getCategoryImage } from '@/constants/CategoryImages';

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
      <Image
        source={getCategoryImage(category)}
        style={{ width: '100%', height: '100%', borderRadius: 16 }}
        contentFit="cover"
        onError={() => {
          return <SkeletonBox width={width} height={height} borderRadius={16} />;
        }}
        onProgress={() => {
          return <SkeletonBox width={width} height={height} borderRadius={16} />;
        }}
        cachePolicy="disk"
        allowDownscaling={true}
      />
    </View>
  );
};

export default EventImage;