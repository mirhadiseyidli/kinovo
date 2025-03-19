import React from 'react';
import { View, Text } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const AppInfoSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 32, fontFamily: 'Didot', color: themeColors.text, marginBottom: 10 }}>Kinovo</Text>
      <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Version 1.0</Text>
    </View>
  );
};

export default AppInfoSettings;


// router.push('/account-settings')
