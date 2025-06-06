import React from 'react';
import { View, Text } from 'react-native';
import SettingComponent from './SettingComponent';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';

const UserSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={{ padding: 16 }}>
      <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>User Settings</ThemedText>
      <SettingComponent 
        icon="user" 
        title="Account Settings" 
        onPress={() => router.push('/(auth)/(profileSections)/accountSettings')} 
      />
      <SettingComponent 
        icon="user-plus" 
        title="Manage Friends" 
        onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
      />
      <SettingComponent 
        icon="activity" 
        title="Manage Favorite Activities" 
        onPress={() => router.push('/(auth)/(profileSections)/manageFavoriteActivities')} 
      />
      <SettingComponent 
        icon="slash" 
        title="Manage Blocked Users" 
        onPress={() => router.push('/(auth)/(profileSections)/blockedUsers')} 
      />
    </View>
  );
};

export default UserSettings;
