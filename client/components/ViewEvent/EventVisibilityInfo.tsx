import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventVisibilityInfoProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

const EventVisibilityInfo: React.FC<EventVisibilityInfoProps> = React.memo(({ visibility }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ 
      flexDirection: 'row', 
      gap: 12,
      paddingTop: 16, 
      borderTopColor: themeColors.calendarBorderColor,
      borderTopWidth: 0.2
    }}>
      <Feather name={visibility === 'public' ? 'globe' : 'lock'} size={16} color={themeColors.mountainGreen} />
      <ThemedText>{visibility.charAt(0).toUpperCase() + visibility.slice(1)} Event</ThemedText>
    </View>
)}); 

export default EventVisibilityInfo;