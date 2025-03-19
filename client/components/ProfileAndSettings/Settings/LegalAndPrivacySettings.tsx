import React from 'react';
import { View, Text } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const LegalAndPrivacySettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Preferences</Text>
      <SettingComponent 
        icon="file-text" 
        title="Terms of Service" 
        onPress={() => console.log('pushed')} 
      />
      <SettingComponent 
        icon="shield" 
        title="Privacy Policy" 
        onPress={() => console.log('pushed')} 
      />
    </View>
  );
};

export default LegalAndPrivacySettings;


// router.push('/account-settings')
