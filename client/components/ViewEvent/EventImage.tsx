import React from 'react';
import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const EventImage = ({ event_picture }: { event_picture: string | null }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  return (
    <View style={{ width: '60%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }}>
      <Image
        source={event_picture ? { uri: event_picture } : require('@/assets/event-default.png')}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />
    </View>
  );
};

export default EventImage;