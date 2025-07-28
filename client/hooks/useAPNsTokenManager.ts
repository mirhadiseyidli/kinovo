import { useEffect, useCallback, useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/components/Auth/AuthProvider';

const APNS_TOKEN_KEY = '@apns_token';
const APNS_TOKEN_SENT_KEY = '@apns_token_sent';

export const useAPNsTokenManager = () => {
  const [apnsToken, setApnsToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userId } = useAuthSession();

  // Request notification permissions
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      console.log('🔵 APNs: Permission status:', finalStatus, 'Granted:', granted);
      return granted;
    } catch (error) {
      console.error('❌ APNs: Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Get APNs device token
  const getAPNsToken = useCallback(async (): Promise<string | null> => {
    try {
      if (Platform.OS !== 'ios') {
        console.log('🔴 APNs: Not on iOS platform');
        return null;
      }

      const token = await Notifications.getDevicePushTokenAsync();
      console.log('✅ APNs: Token received', { tokenStart: token.data.substring(0, 20) + '...' });
      return token.data;
    } catch (error) {
      console.error('❌ APNs: Error getting device token:', error);
      return null;
    }
  }, []);

  // Send token to server
  const sendTokenToServer = useCallback(async (token: string) => {
    if (!userId || !token) {
      console.log('🔴 APNs: Cannot send token - missing userId or token', { userId: !!userId, token: !!token });
      return false;
    }

    console.log('🔵 APNs: Sending token to server', { userId, tokenStart: token.substring(0, 20) + '...' });
    try {
      const response = await api.post('/api/push-fetch/token', {
        token
      });
      
      console.log('✅ APNs: Token sent successfully', response.data);
      
      // Mark token as sent
      await AsyncStorage.setItem(APNS_TOKEN_SENT_KEY, token);
      return true;
    } catch (error) {
      console.error('❌ APNs: Failed to send token to server:', error);
      return false;
    }
  }, [userId]);

  // Initialize APNs
  const initializeAPNs = useCallback(async () => {
    if (!userId) {
      console.log('🔴 APNs: Cannot initialize - no userId');
      setIsLoading(false);
      return;
    }

    console.log('🔵 APNs: Initializing APNs for user', userId);
    
    try {
      // Request permission
      console.log('🔵 APNs: Requesting notification permission');
      const hasPermission = await requestNotificationPermission();
      setPermissionGranted(hasPermission);
      console.log('🔵 APNs: Permission granted:', hasPermission);

      if (!hasPermission) {
        console.log('🔴 APNs: No permission granted, stopping initialization');
        setIsLoading(false);
        return;
      }

      // Get token
      console.log('🔵 APNs: Getting APNs token');
      const token = await getAPNsToken();
      if (token) {
        console.log('✅ APNs: Token received', { tokenStart: token.substring(0, 20) + '...' });
        setApnsToken(token);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, token);

        // Check if this token was already sent
        const lastSentToken = await AsyncStorage.getItem(APNS_TOKEN_SENT_KEY);
        console.log('🔵 APNs: Checking if token needs to be sent', { 
          tokenChanged: lastSentToken !== token,
          lastSentStart: lastSentToken ? lastSentToken.substring(0, 20) + '...' : 'none'
        });
        
        if (lastSentToken !== token) {
          console.log('🔵 APNs: Token changed, sending to server');
          await sendTokenToServer(token);
        } else {
          console.log('🔵 APNs: Token appears already sent, but verifying by sending anyway (debug mode)');
          await sendTokenToServer(token);
        }
      } else {
        console.log('🔴 APNs: No token received');
      }
    } catch (error) {
      console.error('❌ APNs: Error initializing APNs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sendTokenToServer, requestNotificationPermission, getAPNsToken]);

  // Setup notification listeners
  const setupNotificationListeners = useCallback(() => {
    console.log('🔵 APNs: Setting up notification listeners');

    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 APNs: Foreground notification received', notification);
      
      // For push-to-fetch, trigger data refresh
      const payload = notification.request.content.data;
      if (payload) {
        console.log('🔄 APNs: Triggering data fetch for payload:', payload);
        // You can emit events or call refresh functions here
        // For example: eventBus.emit('refreshData', payload);
      }
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 APNs: Notification tapped', response);
      
      const payload = response.notification.request.content.data;
      if (payload) {
        console.log('🔄 APNs: Processing notification tap payload:', payload);
        // Handle navigation or data refresh based on notification type
        // For example: navigate to specific screen based on payload.type
      }
    });

    // Handle background notifications (for push-to-fetch)
    const backgroundSubscription = Notifications.addPushTokenListener((token) => {
      console.log('🔄 APNs: Push token refreshed', { tokenStart: token.data?.substring(0, 20) + '...' });
      if (token.data) {
        setApnsToken(token.data);
        sendTokenToServer(token.data);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
      backgroundSubscription.remove();
    };
  }, [sendTokenToServer]);

  // Initialize when user is available
  useEffect(() => {
    initializeAPNs();
  }, [initializeAPNs]);

  // Setup listeners
  useEffect(() => {
    if (!userId) return;
    return setupNotificationListeners();
  }, [userId, setupNotificationListeners]);

  // Re-request permission if denied
  const requestPermission = useCallback(async () => {
    const hasPermission = await requestNotificationPermission();
    setPermissionGranted(hasPermission);
    
    if (hasPermission && !apnsToken) {
      const token = await getAPNsToken();
      if (token) {
        setApnsToken(token);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, token);
        await sendTokenToServer(token);
      }
    }
    
    return hasPermission;
  }, [apnsToken, sendTokenToServer, requestNotificationPermission, getAPNsToken]);

  return {
    apnsToken,
    permissionGranted,
    isLoading,
    requestPermission,
    sendTokenToServer
  };
};