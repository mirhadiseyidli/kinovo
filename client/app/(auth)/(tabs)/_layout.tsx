import { Stack, Tabs, useRouter, Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, View, Easing } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Feather from '@expo/vector-icons/Feather';
import { ProfileIcon } from '@/components/ui/ProfileIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarViewProvider } from '@/context/CalendarViewContext';

export default function TabsLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  return (
    <CalendarViewProvider>
      <View style={{ 
          flex: 1,
          backgroundColor: Colors[colorScheme ?? 'dark'].background
        }}
      >
        <Tabs
          initialRouteName="index"
          backBehavior="history"
          detachInactiveScreens={false}
          screenOptions={{
            tabBarButton: HapticTab,
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
                // animation: 'spring',
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
              },
              show: {
                animation: 'spring'
              }
            },
            transitionSpec: {
              animation: 'spring',
              config: {
                stiffness: 500,
                damping: 300,  // Increased damping to reduce oscillations
                mass: 3,
                overshootClamping: true,  // Prevents overshoot and shaking
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
              },
            }
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              lazy: true,
              title: 'Home',
              tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} />,
              animation: 'shift'
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              lazy: true,
              title: 'Explore',
              tabBarIcon: ({ color }) => <Feather name="search" size={28} color={color} />,
              animation: 'shift'
            }}
          />
          <Tabs.Screen
            name="create"
            options={{
              title: 'Create Event',
              tabBarIcon: ({ color }) => (
                <Feather name="plus-circle" size={28} color={color} />
              ),
            }}
            listeners={() => ({
              tabPress: (e) => {
                e.preventDefault(); // Prevent default tab navigation
                router.push('/(auth)/(createEvent)/EventDetails');
              },
            })}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              lazy: true,
              title: 'Calendar',
              tabBarIcon: ({ color }) => <Feather name="calendar" size={28} color={color} />,
              animation: 'shift'
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              lazy: true,
              title: 'Profile',
              tabBarIcon: ({ color }) => <Feather name="user" size={28} color={color} />,
              animation: 'shift'
            }}
          />
          <Tabs.Screen
            name="(profile)/[_id]"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="(profile)/editProfile"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="(profile)/accountSettings"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="(profile)/(manageFriends)"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </View>
    </CalendarViewProvider>
  );
}