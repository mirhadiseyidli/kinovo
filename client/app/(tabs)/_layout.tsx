import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '../../components/HapticTab';
import { IconSymbol } from '../../components/ui/IconSymbol';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { ProfileIcon } from '@/components/ui/ProfileIcon';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? 'light-content' : 'dark-content';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
        // tabBarActiveTintColor: '#4fb9af',
        // tabBarInactiveTintColor: colorScheme === 'dark' ? 'light-content' : 'dark-content',
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute', // Keeps the position absolute on iOS
            backgroundColor: Colors[colorScheme ?? 'dark'].background, // Dark or light theme
            borderTopWidth: 1, // Border width
            borderTopColor: Colors[colorScheme ?? 'dark'].background, // Gray-100 hex code
            shadowOpacity: 0.1, // Slight shadow for depth
            elevation: 3, // Android shadow
            paddingTop: 4, // Add padding at the top
            itemsAlign: 'center',
            justifyContent: 'center'
          },
          default: {
            // backgroundColor: colorScheme === 'dark' ? '#333' : '#F3F4F6', // Background for other platforms
            backgroundColor: '#F3F4F6', // Dark or light theme
            borderTopWidth: 1, // Border width
            borderTopColor: '#F3F4F6', // Gray-100 hex code
            paddingTop: 10, // Add padding at the top
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Feather name="search" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color}/>,
        }}
      />
    </Tabs>
  );
}