import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { EventTimeAndDateProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';

const EventTimeAndDate: React.FC<EventTimeAndDateProps> = React.memo(({ startLabel, endLabel }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Feather name="clock" size={16} color={themeColors.mountainGreen} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 4, flexShrink: 1, flexWrap: 'nowrap' }}>
        <ThemedText adjustsFontSizeToFit={true} numberOfLines={1}>Start time: {startLabel}</ThemedText>
        <ThemedText style={{ color: themeColors.placeholderTextColor }} adjustsFontSizeToFit={true} numberOfLines={1}>End time: {endLabel}</ThemedText>
      </View>
    </View>
)});

export default EventTimeAndDate;