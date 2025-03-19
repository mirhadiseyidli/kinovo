import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  onPress: () => void;
}

const SettingComponent: React.FC<SettingItemProps> = ({ icon, title, onPress }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 10 }}>
      <Feather name={icon} size={24} style={{ color: themeColors.text }} />
      <ThemedText style={{ marginLeft: 10, fontSize: 16 }}>{title}</ThemedText>
      <Feather name="chevron-right" size={24} style={{ marginLeft: 'auto', color: themeColors.text }} />
    </TouchableOpacity>
  );
};

export default SettingComponent;
