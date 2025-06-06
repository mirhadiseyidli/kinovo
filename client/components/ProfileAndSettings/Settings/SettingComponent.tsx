import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { SettingItemProps } from '@/types/allTypes';

const SettingComponent: React.FC<SettingItemProps> = ({ icon, title, subtitle, onPress, enabled = true }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-start', 
        padding: 10,
        opacity: enabled ? 1 : 0.5 
      }}
    >
      <Feather name={icon} size={24} style={{ color: themeColors.text }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <ThemedText style={{ fontSize: 16 }}>{title}</ThemedText>
        {subtitle && (
          <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginTop: 2 }}>{subtitle}</ThemedText>
        )}
      </View>
      <Feather name="chevron-right" size={24} style={{ color: themeColors.text }} />
    </TouchableOpacity>
  );
};

export default SettingComponent;
