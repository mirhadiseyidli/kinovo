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

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'globe';
      case 'private':
        return 'lock';
      case 'selected':
        return 'lock';
      default:
        return 'lock';
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'Public Event';
      case 'private':
        return 'Friends Only Event';
      case 'selected':
        return 'Private Event';
      default:
        return 'Event';
    }
  };

  return (
    <View style={{ 
      flexDirection: 'row', 
      gap: 12,
      paddingTop: 16, 
      borderTopColor: themeColors.calendarBorderColor,
      borderTopWidth: 0.2
    }}>
      <Feather name={getVisibilityIcon(visibility)} size={16} color={themeColors.mountainGreen} />
      <ThemedText>{getVisibilityText(visibility)}</ThemedText>
    </View>
  );
});

export default EventVisibilityInfo;