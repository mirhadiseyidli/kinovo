import React from 'react';
import { View, Text, Alert } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const ResourcesSettings = () => {
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
      <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Resources</Text>
      <SettingComponent 
        icon="help-circle" 
        title="Help & Support" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
      <SettingComponent 
        icon="star" 
        title="Rate App" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
      <SettingComponent 
        icon="align-left" 
        title="About Us" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
    </View>
  );
};

export default ResourcesSettings;


// router.push('/account-settings')
