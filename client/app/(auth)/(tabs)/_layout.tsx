import { Stack, Tabs, useRouter, Link } from 'expo-router';
import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import { ProfileIcon } from '@/components/ui/ProfileIcon';
import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Options from '@/components/CreateEvent/Options';

export default function TabsLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const color = colorScheme === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={{ 
        flex: 1,
        backgroundColor: Colors[colorScheme ?? 'dark'].background
      }}
    >
      <Tabs
        initialRouteName="index"
        backBehavior="history"
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
            },
            show: {
              animation: 'spring'
            }
          },
          animation: 'fade', // ✅ Prevents flashin
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Feather name="home" size={28} color={color} />,
            animation: 'fade'
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <Feather name="search" size={28} color={color} />,
            animation: 'fade'
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: 'Create Event',
            tabBarIcon: ({ color }) => (
              <Ionicons name="add-circle-outline" size={28} color={color} />
            ),
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault(); // Prevent default tab navigation
              router.replace('/(auth)/(tabs)/(modals)/create-event'); // Open modal without replacing background
            },
          })}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <Feather name="calendar" size={28} color={color} />,
            animation: 'fade'
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <ProfileIcon color={color}/>,
            animation: 'fade'
          }}
        />
        <Tabs.Screen
          name="(modals)/create-event"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="(profile)/profilePage"
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
      </Tabs>
    </View>
  );
}