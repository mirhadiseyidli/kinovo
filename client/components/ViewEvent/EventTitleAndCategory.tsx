import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventTitleAndCategoryProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const EventTitleAndCategory: React.FC<EventTitleAndCategoryProps> = React.memo(({ title, category }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
  
  <View style={{ 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center',
    borderTopColor: themeColors.calendarBorderColor,
    borderTopWidth: 0.2,
    paddingTop: 16,
    marginTop: 16,
    justifyContent: 'space-between'
  }}>
    <ThemedText style={{ fontSize: 24, fontWeight: 'bold' }}>{title}</ThemedText>
    <ThemedText style={{ 
      paddingVertical: 2,
      fontWeight: 'bold',
      backgroundColor: themeColors.mountainGreen, 
      paddingHorizontal: 8, 
      borderRadius: 4,
      color: 'white'
    }}>
      {category}
    </ThemedText>
  </View>
)});

export default EventTitleAndCategory;