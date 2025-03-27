import React from 'react';
import { TouchableOpacity, TextInput, Dimensions } from "react-native";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Router, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigateBackButtonProps } from '@/types/allTypes';

const NavigateBackButton = ({
  iconName = 'chevron.left',
  size = 24,
  color,
  backgroundColor,
  top,
  left,
}: NavigateBackButtonProps) => {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const iconColor = color ?? themeColors.text;
  const bgColor = backgroundColor ?? themeColors.buttonBackgroundColor;
  const router = useRouter();
  const posTop = top ?? insets.top + 4;
  const posLeft = left ?? 16;

  return (
    <TouchableOpacity 
      style={{ 
        position: 'absolute', 
        top: posTop, 
        left: posLeft, 
        backgroundColor: bgColor, 
        padding: 8, 
        borderRadius: 8,
        zIndex: 10,
      }}
      onPress={() => router.back()}
    >
      <IconSymbol name={iconName} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

export default NavigateBackButton;