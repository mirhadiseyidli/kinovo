import React from 'react';
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

const Tab = createMaterialTopTabNavigator();

export default function ManageFriendsTabs() {
  const colorScheme = useColorScheme();
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top, paddingBottom: tabBarHeight }}>
      {/* Header remains at the top */}
      <ThemedView
        style={{
          flex: 1,
          flexGrow: 1,
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6,
        }}
      >
        <SettingsPageHeader label='Manage Friends'/>
      </ThemedView>
      <Tab.Navigator
        initialRouteName="Friends"
        backBehavior='none'
        screenOptions={{
          tabBarIndicatorStyle: { backgroundColor: Colors[colorScheme ?? 'dark'].tint },
          tabBarStyle: { backgroundColor: Colors[colorScheme ?? 'dark'].background },
          tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
          tabBarInactiveTintColor: 'gray',
        }}
      >
        <Tab.Screen 
          name="Friends" 
          component={FriendsList} 
          options={{ title: 'Friends' }} 
        />
        <Tab.Screen 
          name="Requests" 
          component={FriendRequests} 
          options={{ title: 'Requests' }} 
        />
        <Tab.Screen 
          name="Contacts" 
          component={SyncContacts} 
          options={{ title: 'Contacts' }} 
        />
        <Tab.Screen 
          name="Suggestions" 
          component={FriendSuggestions} 
          options={{ title: 'Suggestions' }} 
        />
      </Tab.Navigator>
    </ThemedView>
  );
}