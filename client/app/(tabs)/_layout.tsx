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
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? 'light-content' : 'dark-content';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute', // Keeps the position absolute on iOS
            backgroundColor: Colors[colorScheme ?? 'dark'].background, // Dark or light theme
            borderTopWidth: 1, // Border width
            borderTopColor: Colors[colorScheme ?? 'dark'].border, // Gray-100 hex code
            shadowOpacity: 0.1, // Slight shadow for depth
            elevation: 3, // Android shadow
            paddingTop: 4, // Add padding at the top
            itemsAlign: 'center',
            justifyContent: 'center',
            animation: 'spring',
          },
          default: {
            backgroundColor: Colors[colorScheme ?? 'dark'].background, // Background for other platforms
            borderTopWidth: 1, // Border width
            borderTopColor: Colors[colorScheme ?? 'dark'].border, // Gray-100 hex code
            paddingTop: 10, // Add padding at the top
          },
        }),
        tabBarVisibilityAnimationConfig: {
          hide: {
            animation: 'spring'
          }
        }
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
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={28} color={color} />,
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