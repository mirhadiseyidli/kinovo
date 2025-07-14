import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, RefreshControl, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useFCMTokenManager } from '@/hooks/useFCMTokenManager';

const PushNotifications = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  const { preferences, loading, refreshing, togglePreference, onRefresh } = useNotificationPreferences('push');
  const { fcmToken, permissionGranted, isLoading: fcmLoading, requestPermission } = useFCMTokenManager();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Check if we need to show permission prompt
  useEffect(() => {
    if (!fcmLoading && !permissionGranted && !fcmToken) {
      setShowPermissionPrompt(true);
    } else {
      setShowPermissionPrompt(false);
    }
  }, [fcmLoading, permissionGranted, fcmToken]);

  const handleRequestPermission = async () => {
    try {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Push notifications require permission to work. Please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              // You could add logic to open device settings here
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const notificationTypeLabels = {
    friend_request_accepted: 'Friend Request Accepted',
    event_reminder_10_mins: 'Event Reminders (10 minutes)',
    event_reminder_1_hour: 'Event Reminders (1 hour)',
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
          headerTitle: 'Push Notifications',
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
          Choose which push notifications you want to receive on your device.
        </ThemedText>

        {/* Permission status and request */}
        {showPermissionPrompt && (
          <View style={{
            backgroundColor: themeColors.border,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Feather name="bell-off" size={20} color={themeColors.text} style={{ marginRight: 8 }} />
              <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                Push Notifications Disabled
              </ThemedText>
            </View>
            <ThemedText style={{ 
              fontSize: 14, 
              color: themeColors.placeholderTextColor,
              marginBottom: 12,
              lineHeight: 18
            }}>
              Push notifications are currently disabled. Enable them to receive notifications even when the app is closed.
            </ThemedText>
            <TouchableOpacity
              onPress={handleRequestPermission}
              style={{
                backgroundColor: themeColors.mountainGreen,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                alignItems: 'center'
              }}
            >
              <ThemedText style={{ 
                color: 'white', 
                fontSize: 14, 
                fontWeight: '600' 
              }}>
                Enable Push Notifications
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Status indicator */}
        {!fcmLoading && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 20,
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: permissionGranted && fcmToken ? 
              `${themeColors.mountainGreen}20` : 
              `${themeColors.placeholderTextColor}20`,
            borderRadius: 8
          }}>
            <Feather 
              name={permissionGranted && fcmToken ? "check-circle" : "alert-circle"} 
              size={16} 
              color={permissionGranted && fcmToken ? themeColors.mountainGreen : themeColors.placeholderTextColor}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={{ 
              fontSize: 13,
              color: permissionGranted && fcmToken ? themeColors.mountainGreen : themeColors.placeholderTextColor
            }}>
              {permissionGranted && fcmToken ? 
                'Push notifications are enabled' : 
                'Push notifications are disabled'
              }
            </ThemedText>
          </View>
        )}

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

export default PushNotifications; 