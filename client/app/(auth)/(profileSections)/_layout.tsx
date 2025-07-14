import { router, Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfilePreviewMenu from '@/components/ProfileAndSettings/Settings/ProfilePreviewMenu';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useState, useCallback, useMemo } from 'react';

export default function NotificationsLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [showPicker, setShowPicker] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  const headerLeftButton = useMemo(() => (
    <TouchableOpacity 
      onPress={goBack}
    >
      <Feather name="chevron-left" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), []);

  const headerRightButtonProfilePreview = useMemo(() => (
    <ProfilePreviewMenu /> 
  ), []);

  const headerRightButtonPicker = useMemo(() => (
    <TouchableOpacity
      onPress={() => setShowPicker(true)}
    >
      <IconSymbol name="plus.circle" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), []);

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen
        name="accountSettings"
        options={{
          headerTitle: 'Account Settings',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="blockedUsers"
        options={{
          headerTitle: 'Blocked Users',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="calendarPermissions"
        options={{
          headerTitle: 'Calendar Permissions',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="changePassword"
        options={{
          headerTitle: 'Change Password',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="contactsPermissions"
        options={{
          headerTitle: 'Contacts Permissions',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="editEmail"
        options={{
          headerTitle: 'Email Address',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="editPhone"
        options={{
          headerTitle: 'Phone Number',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="editProfile"
        options={{
          headerTitle: 'Edit Profile',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
          headerRight: () => headerRightButtonProfilePreview,
        }} 
      />
      <Stack.Screen 
        name="editUsername"
        options={{
          headerTitle: 'Username',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="emailNotifications"
        options={{
          headerTitle: 'Email Notifications',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="inAppNotifications"
        options={{
          headerTitle: 'In-App Notifications',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="locationPermissions"
        options={{
          headerTitle: 'Location Permissions',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="notificationSettings"
        options={{
          headerTitle: 'Notification Settings',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="photoPermissions"
        options={{
          headerTitle: 'Photo Album Permissions',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="pushNotifications"
        options={{
          headerTitle: 'Push Notifications',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
        }} 
      />
      <Stack.Screen 
        name="manageFavoriteActivities"
        initialParams={{
          showPicker,
          setShowPicker,
        }}
        options={{
          headerTitle: 'Favorite Activities',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => headerLeftButton,
          headerRight: () => headerRightButtonPicker,
        }} 
      />
    </Stack>
  );
} 