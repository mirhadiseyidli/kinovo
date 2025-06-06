import { Stack, Tabs, useRouter, Link } from 'expo-router';
import React, { useRef, useState, useCallback } from 'react';
import { Platform, View, Easing, InteractionManager } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Feather from '@expo/vector-icons/Feather';
import { ProfileIcon } from '@/components/ui/ProfileIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CalendarViewProvider } from '@/context/CalendarViewContext';

const TabsLayout = React.memo(() => {
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Memoize tab bar icon components for better performance
  const TabBarIcons = React.useMemo(() => ({
    home: ({ color }: { color: string }) => <Feather name="home" size={28} color={color} />,
    search: ({ color }: { color: string }) => <Feather name="search" size={28} color={color} />,
    plus: ({ color }: { color: string }) => <Feather name="plus-circle" size={28} color={color} />,
    calendar: ({ color }: { color: string }) => <Feather name="calendar" size={28} color={color} />,
    user: ({ color }: { color: string }) => <Feather name="user" size={28} color={color} />,
  }), []);

  // Memoize navigation handler for better performance
  const handleCreateEventPress = useCallback((e: any) => {
    e.preventDefault();
    // Use InteractionManager for smoother navigation
    InteractionManager.runAfterInteractions(() => {
      router.push('/(auth)/(createEvent)/EventDetails');
    });
  }, [router]);

  // Memoize tab bar style for performance
  const tabBarStyle = React.useMemo(() => Platform.select({
    ios: {
      position: 'absolute' as const,
      backgroundColor: Colors[colorScheme ?? 'dark'].background,
      borderTopWidth: 1,
      borderTopColor: Colors[colorScheme ?? 'dark'].border,
      shadowOpacity: 0.1,
      elevation: 3,
      paddingTop: 4,
      itemsAlign: 'center' as const,
      justifyContent: 'center' as const,
    },
    default: {
      backgroundColor: Colors[colorScheme ?? 'dark'].background,
      borderTopWidth: 1,
      borderTopColor: Colors[colorScheme ?? 'dark'].border,
      paddingTop: 10,
    },
  }), [colorScheme]);

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
            tabBarStyle: tabBarStyle,
            // Optimized animations for smooth transitions
            animation: 'shift',
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              lazy: true,
              title: 'Home',
              tabBarIcon: TabBarIcons.home,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              lazy: true,
              title: 'Explore',
              tabBarIcon: TabBarIcons.search,
            }}
          />
          <Tabs.Screen
            name="create"
            options={{
              title: 'Create Event',
              tabBarIcon: TabBarIcons.plus,
            }}
            listeners={() => ({
              tabPress: handleCreateEventPress,
            })}
          />
          <Tabs.Screen
            name="calendar"
            options={{
              lazy: true,
              title: 'Calendar',
              tabBarIcon: TabBarIcons.calendar,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              lazy: true,
              title: 'Profile',
              tabBarIcon: TabBarIcons.user,
            }}
          />
        </Tabs>
      </View>
    </CalendarViewProvider>
  );
});

export default TabsLayout;