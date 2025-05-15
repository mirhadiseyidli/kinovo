import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventRecurrenceProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

const EventRecurrence: React.FC<EventRecurrenceProps> = React.memo(({ frequency, endDate }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Feather name="calendar" size={16} color={themeColors.mountainGreen} />
      <View style={{ flexDirection: 'column', gap: 4 }}>
        <ThemedText>Repeats {frequency}</ThemedText>
        {endDate && (
          <ThemedText style={{ color: themeColors.placeholderTextColor }}>
            Until: {format(new Date(endDate), 'MMMM d, yyyy')}
          </ThemedText>
        )}
      </View>
    </View>
)});

export default EventRecurrence;
