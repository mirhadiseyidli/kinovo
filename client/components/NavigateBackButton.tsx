import React from 'react';
import { TouchableOpacity, TextInput, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Router, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NavigateBackButton = ({
  iconName = 'chevron.left',
  size = 24,
  color,
  backgroundColor,
}: {
  iconName?: import('@/components/ui/IconSymbol').IconSymbolName;
  size?: number;
  color?: string;
  backgroundColor?: string;
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const iconColor = color ?? themeColors.text;
  const bgColor = backgroundColor ?? themeColors.background;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity 
      style={{ 
        position: 'absolute', 
        top: 16, 
        left: 16, 
        backgroundColor: bgColor, 
        padding: 8, 
        borderRadius: 8, 
        marginTop: insets.top,
        zIndex: 10
      }}
      onPress={() => router.back()}
    >
      <IconSymbol name={iconName} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

export default NavigateBackButton;