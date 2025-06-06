import React from 'react';
import { View, Text, Alert } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const LegalAndPrivacySettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleDisabledInfo = () => {
    Alert.alert(
      "Not Available",
      "This feature is not available yet.",
      [{ text: "OK" }]
    );
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Preferences</Text>
      <SettingComponent 
        icon="file-text" 
        title="Terms of Service" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
      <SettingComponent 
        icon="shield" 
        title="Privacy Policy" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
    </View>
  );
};

export default LegalAndPrivacySettings;


// router.push('/account-settings')
