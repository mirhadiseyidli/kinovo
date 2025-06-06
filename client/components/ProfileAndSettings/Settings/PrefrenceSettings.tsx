import React from 'react';
import { View, Text, Alert } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const PreferenceSettings = () => {
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
        icon="bell" 
        title="Notifications" 
        onPress={handleDisabledInfo} 
        enabled={false}
      />
      {/* <SettingComponent 
        icon="moon" 
        title="Theme & Display" 
        onPress={() => console.log('pushed')} 
      />
      <SettingComponent 
        icon="globe" 
        title="Language" 
        onPress={() => console.log('pushed')} 
      /> */}
    </View>
  );
};

export default PreferenceSettings;


// router.push('/account-settings')
