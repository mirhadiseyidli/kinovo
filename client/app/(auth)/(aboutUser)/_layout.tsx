import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, useWindowDimensions, Text } from 'react-native';
import { TabView, SceneMap, TabBar, TabBarProps } from 'react-native-tab-view';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
  import UserEvents from '@/app/(auth)/(aboutUser)/UsersEvents';
  import UserFriends from '@/app/(auth)/(aboutUser)/UsersFriends';
  import UserActivities from '@/app/(auth)/(aboutUser)/UserActivities';
import { User, UserProp } from '@/types/allTypes';
import { Stack } from 'expo-router';

const ProfileTabs = forwardRef((props: { user: User }, ref) => {
  const layout = useWindowDimensions();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true
        }}
      >
        <Stack.Screen name="UserEvents" options={{ headerShown: false, freezeOnBlur: true }} />
        <Stack.Screen name="UserFriends" options={{ headerShown: false, freezeOnBlur: true }} />
        <Stack.Screen name="UserActivities" options={{ headerShown: false, freezeOnBlur: true }} />
      </Stack>
    </ThemedView>
  );
});

export default ProfileTabs; 
