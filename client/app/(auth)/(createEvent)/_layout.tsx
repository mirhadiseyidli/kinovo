import React, { useState, useEffect } from 'react';
import { Dimensions, Image, StatusBar, Modal, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDateAndLocation from '@/app/(auth)/(createEvent)/EventDateAndLocation';
import EventDetails from '@/app/(auth)/(createEvent)/EventDetails';
import EventAttendeesAndOptions from '@/app/(auth)/(createEvent)/EventAttendeesAndOptions';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window'); // Get screen width dynamically

export default function CreateEventTabs() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Tab.Navigator
        // If you have multiple tabs, specify the initial route if needed:
        initialRouteName="Details"
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
          options={{ title: 'What' }}
        />
        <Tab.Screen 
          name="Date & Location" 
          component={EventDateAndLocation} 
          options={{ title: 'When & Where' }}
        />
        <Tab.Screen 
          name="Attendees & Options" 
          component={EventAttendeesAndOptions} 
          options={{ title: 'Who' }}
        />
      </Tab.Navigator>
    </ThemedView>
  );
}