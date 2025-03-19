import React from 'react';
import { View, Text } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const ResourcesSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Resources</Text>
      <SettingComponent 
        icon="help-circle" 
        title="Help & Support" 
        onPress={() => console.log('pushed')} 
      />
      <SettingComponent 
        icon="message-square" 
        title="FAQs" 
        onPress={() => console.log('pushed')} 
      />
      <SettingComponent 
        icon="star" 
        title="Rate App" 
        onPress={() => console.log('pushed')} 
      />
      <SettingComponent 
        icon="align-left" 
        title="About Us" 
        onPress={() => console.log('pushed')} 
      />
    </View>
  );
};

export default ResourcesSettings;


// router.push('/account-settings')
