import React, { useState, useEffect } from 'react';
import { Dimensions, Image, StatusBar, Modal, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ThemedView } from '@/components/ThemedView';
import SettingsPageHeader from '@/components/ProfileAndSettings/Settings/SettingsPageHeader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Import your tab content components (create these if they don't exist)
import FriendsList from '@/app/(auth)/(tabs)/(profile)/(manageFriends)/YourFriends';
import FriendRequests from '@/app/(auth)/(tabs)/(profile)/(manageFriends)/FriendRequests';
import SyncContacts from '@/app/(auth)/(tabs)/(profile)/(manageFriends)/SyncContacts';
import FriendSuggestions from '@/app/(auth)/(tabs)/(profile)/(manageFriends)/FriendSuggestions';
import EventDateAndLocation from '@/app/(auth)/(createEvent)/EventDateAndLocation';
import EventDetails from '@/app/(auth)/(createEvent)/EventDetails';
import EventAttendeesAndOptions from '@/app/(auth)/(createEvent)/EventAttendeesAndOptions';
import { useRouter, useLocalSearchParams } from 'expo-router';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window'); // Get screen width dynamically

export default function CreateEventTabs() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Tab.Navigator
        // If you have multiple tabs, specify the initial route if needed:
        // initialRouteName="EventDetails"
        screenOptions={{
          tabBarIndicatorContainerStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarStyle: {
            backgroundColor: themeColors.background,
          },
          tabBarIndicatorStyle: {
            backgroundColor: themeColors.text,  // White line under active tab
            height: 3,                // Thickness of the indicator
            top: 0
          },
          tabBarActiveTintColor: themeColors.text,   // Active tab text color
          tabBarInactiveTintColor: themeColors.inputBackgroundColor, // Inactive tab text color
          tabBarLabelStyle: {
            textTransform: 'none',    // Remove uppercase styling
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen 
          name="Details" 
          component={EventDetails} 
          options={{ title: 'Details' }}
        />
        <Tab.Screen 
          name="Date & Location" 
          component={EventDateAndLocation} 
          options={{ title: 'Date & Location' }}
        />
        <Tab.Screen 
          name="Attendees & Options" 
          component={EventAttendeesAndOptions} 
          options={{ title: 'Attendees' }}
        />
      </Tab.Navigator>
    </ThemedView>
  );
}