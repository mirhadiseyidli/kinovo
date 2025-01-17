import { Stack, Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '../../components/HapticTab';
import { IconSymbol } from '../../components/ui/IconSymbol';
import TabBarBackground from '../../components/ui/TabBarBackground';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarShowLabel: false,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute', // Keeps the position absolute on iOS
            // backgroundColor: colorScheme === 'dark' ? '#333' : '#F3F4F6', // Dark or light theme
            backgroundColor: '#F3F4F6', // Dark or light theme
            borderTopWidth: 1, // Border width
            borderTopColor: '#F3F4F6', // Gray-100 hex code
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
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <MaterialIcons name="explore" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}