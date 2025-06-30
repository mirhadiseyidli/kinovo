import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import SettingComponent from '@/components/ProfileAndSettings/Settings/SettingComponent';

const NotificationSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Notification Settings',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView style={{ flex: 1 }}>
        <ThemedText style={{ 
          fontSize: 14, 
          color: themeColors.placeholderTextColor, 
          marginBottom: 16,
          lineHeight: 20,
          paddingHorizontal: 16,
        }}>
          Choose what types of notifications you want to receive across in-app, email, and push channels. 
          Tap on a channel to customize your preferences.
        </ThemedText>

        <ThemedView style={{ flexDirection: 'column', gap: 8, paddingHorizontal: 8 }}>
          <SettingComponent 
            icon="smartphone" 
            title="In-App Notifications" 
            subtitle="Notifications within the app"
            onPress={() => router.push('/(auth)/(profileSections)/inAppNotifications')} 
          />
          <SettingComponent 
            icon="mail" 
            title="Email Notifications" 
            subtitle="Notifications sent to your email"
            onPress={() => router.push('/(auth)/(profileSections)/emailNotifications')} 
          />

          <SettingComponent 
            icon="bell" 
            title="Push Notifications" 
            subtitle="Push notifications to your device"
            onPress={() => router.push('/(auth)/(profileSections)/pushNotifications')} 
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default NotificationSettings; 