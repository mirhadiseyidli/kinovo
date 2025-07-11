import React from 'react';
import { View, ScrollView, TouchableOpacity, Switch, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const InAppNotifications = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const { preferences, loading, refreshing, togglePreference, onRefresh } = useNotificationPreferences('inApp');

  const notificationTypeLabels = {
    friend_request_accepted: 'Friend Request Accepted',
    event_reminder: 'Event Reminders',
    event_updated: 'Event Updates',
    new_event_nearby: 'New Nearby Events',
    event_attendance_confirmed: 'Event Attendance Confirmed',
    new_event_from_friend: 'New Events from Friends',
    event_invitation: 'Event Invitations',
    someone_from_contacts_joined: 'Contacts Joined App',
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Loading preferences...</ThemedText>
      </ThemedView>
    );
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'In-App Notifications',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.text}
            colors={[themeColors.mountainGreen]}
            progressBackgroundColor={themeColors.background}
          />
        }
      >
        <ThemedText style={{ 
          fontSize: 14, 
          color: themeColors.placeholderTextColor, 
          marginBottom: 16,
          lineHeight: 20
        }}>
          Choose which notifications you want to see within the app.
        </ThemedText>

        {Object.entries(notificationTypeLabels).map(([key, label]) => (
          <View key={key} style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <ThemedText style={{ 
              fontSize: 16,
              flex: 1 
            }}>
              {label}
            </ThemedText>
            <Switch
              trackColor={{ 
                false: themeColors.border, 
                true: themeColors.mountainGreen 
              }}
              thumbColor={
                preferences[key as keyof typeof preferences] 
                  ? themeColors.text 
                  : themeColors.placeholderTextColor
              }
              onValueChange={() => togglePreference(key as keyof typeof preferences)}
              value={preferences[key as keyof typeof preferences]}
            />
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
};

export default InAppNotifications; 