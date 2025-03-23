import React from 'react';
import { View, TextInput, Dimensions } from "react-native";
import { ThemedText } from '../../ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Router, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const insets = useSafeAreaInsets();

const SettingsPageTitle = ({
  label,
}: {
  label: string;
}) => {

  return (
    <View style={{ alignItems: 'center' }}>
      <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>{label}</ThemedText>
    </View>
  );
};

export default SettingsPageTitle;