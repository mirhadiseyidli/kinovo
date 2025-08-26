import React from 'react';
import { View, Switch } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface CalendarSyncToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  showLabel?: boolean;
}

export const CalendarSyncToggle: React.FC<CalendarSyncToggleProps> = ({
  value,
  onValueChange,
  showLabel = true,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
  // const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  return (
    <View style={{ 
      flexDirection: 'row', 
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'}}>
        <Feather 
          name="calendar" 
          size={20} 
          color={value ? themeColors.text : themeColors.placeholderTextColor} 
        />
        
        {showLabel && (
          <ThemedText style={{ fontSize: 16, color: value ? themeColors.text : themeColors.placeholderTextColor }}>
            Sync to Calendar
          </ThemedText>
        )}
      </View>
      
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ 
          false: themeColors.border, 
          true: themeColors.mountainGreen 
        }}
        thumbColor={themeColors.text}
      />
    </View>
  );
};