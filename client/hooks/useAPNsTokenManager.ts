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
        return null;
      }

      const token = await Notifications.getDevicePushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('❌ APNs: Error getting device token:', error);
      return null;
    }
  }, []);

  // Send token to server
  const sendTokenToServer = useCallback(async (token: string) => {
    if (!userId || !token) {
      return false;
    }

    try {
      const response = await api.post('/api/push-fetch/token', {
        token
      });
      
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
      setIsLoading(false);
      return;
    }
    
    try {
      // Request permission
      const hasPermission = await requestNotificationPermission();
      setPermissionGranted(hasPermission);

      if (!hasPermission) {
        setIsLoading(false);
        return;
      }

      // Get token
      const token = await getAPNsToken();
      if (token) {
        setApnsToken(token);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, token);

        // Check if this token was already sent
        const lastSentToken = await AsyncStorage.getItem(APNS_TOKEN_SENT_KEY);
        
        if (lastSentToken !== token) {
          await sendTokenToServer(token);
        } else {
          await sendTokenToServer(token);
        }
      } else {
        console.warn('🔴 APNs: No token received');
      }
    } catch (error) {
      console.error('❌ APNs: Error initializing APNs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sendTokenToServer, requestNotificationPermission, getAPNsToken]);

  // Setup notification listeners
  const setupNotificationListeners = useCallback(() => {

    // Handle foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      
      // For push-to-fetch, trigger data refresh
      const payload = notification.request.content.data;
      if (payload) {
        // You can emit events or call refresh functions here
        // For example: eventBus.emit('refreshData', payload);
      }
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      
      const payload = response.notification.request.content.data;
      if (payload) {
        // Handle navigation or data refresh based on notification type
        // For example: navigate to specific screen based on payload.type
      }
    });

    // Handle background notifications (for push-to-fetch)
    const backgroundSubscription = Notifications.addPushTokenListener((token) => {
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