import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import api from '@/utils/api';

const NotificationTestComponent = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async () => {
    if (!fcmToken || !permissionGranted) {
      Alert.alert(
        'Error',
        'Push notification permission not granted or FCM token not available',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      // Create a dummy event for testing
      const dummyEvent = {
        eventId: 'test-event-' + Date.now(),
        eventTitle: 'Test Event',
        timeUntil: '5 minutes'
      };

      // Send test notification
      const response = await api.post('/api/notifications/test', {
        token: fcmToken,
        type: 'event_reminder',
        payload: dummyEvent
      });

      if (response.data.success) {
        Alert.alert('Success', 'Test notification sent successfully');
      } else {
        throw new Error(response.data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ 
      padding: 20, 
      backgroundColor: themeColors.background,
      borderRadius: 10,
      margin: 20,
      alignItems: 'center'
    }}>
      <Text style={{ 
        color: themeColors.text, 
        fontSize: 18, 
        fontWeight: 'bold',
        marginBottom: 20
      }}>
        Push Notification Test
      </Text>

      <TouchableOpacity
        onPress={sendTestNotification}
        disabled={loading}
        style={{
          backgroundColor: loading ? themeColors.inputBackgroundColor : themeColors.mountainGreen,
          padding: 15,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 200,
          justifyContent: 'center'
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={themeColors.text} style={{ marginRight: 10 }} />
            <Text style={{ color: themeColors.text }}>
              Sending...
            </Text>
          </>
        ) : (
          <>
            <Feather name="bell" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Send Test Notification
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!permissionGranted && (
        <Text style={{ 
          color: 'red', 
          marginTop: 10,
          textAlign: 'center'
        }}>
          Push notification permission not granted
        </Text>
      )}

      {!fcmToken && (
        <Text style={{ 
          color: 'red', 
          marginTop: 10,
          textAlign: 'center'
        }}>
          FCM token not available
        </Text>
      )}
    </View>
  );
};

export default NotificationTestComponent; 