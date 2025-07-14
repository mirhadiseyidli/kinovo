import { useEffect, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { requestNotificationPermission, getFCMToken, setupFCMListeners } from '@/config/firebase';
import api from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/components/Auth/AuthProvider';

const FCM_TOKEN_KEY = '@fcm_token';
const FCM_TOKEN_SENT_KEY = '@fcm_token_sent';

export const useFCMTokenManager = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userId } = useAuthSession();

  // Send token to server
  const sendTokenToServer = useCallback(async (token: string) => {
    if (!userId || !token) {
      console.log('🔴 FCM: Cannot send token - missing userId or token', { userId: !!userId, token: !!token });
      return false;
    }

    console.log('🔵 FCM: Sending token to server', { userId, tokenStart: token.substring(0, 20) + '...' });
    try {
      const response = await api.post('/api/notifications/fcm-token', {
        token,
        platform: Platform.OS,
        userId
      });
      
      console.log('✅ FCM: Token sent successfully', response.data);
      
      // Mark token as sent
      await AsyncStorage.setItem(FCM_TOKEN_SENT_KEY, token);
      return true;
    } catch (error) {
      console.error('❌ FCM: Failed to send token to server:', error);
      return false;
    }
  }, [userId]);

  // Initialize FCM
  const initializeFCM = useCallback(async () => {
    if (!userId) {
      console.log('🔴 FCM: Cannot initialize - no userId');
      setIsLoading(false);
      return;
    }

    console.log('🔵 FCM: Initializing FCM for user', userId);
    
    try {
      // Request permission
      console.log('🔵 FCM: Requesting notification permission');
      const hasPermission = await requestNotificationPermission();
      setPermissionGranted(hasPermission);
      console.log('🔵 FCM: Permission granted:', hasPermission);

      if (!hasPermission) {
        console.log('🔴 FCM: No permission granted, stopping initialization');
        setIsLoading(false);
        return;
      }

      // Get token
      console.log('🔵 FCM: Getting FCM token');
      const token = await getFCMToken();
      if (token) {
        console.log('✅ FCM: Token received', { tokenStart: token.substring(0, 20) + '...' });
        setFcmToken(token);
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);

        // Check if this token was already sent
        const lastSentToken = await AsyncStorage.getItem(FCM_TOKEN_SENT_KEY);
        console.log('🔵 FCM: Checking if token needs to be sent', { 
          tokenChanged: lastSentToken !== token,
          lastSentStart: lastSentToken ? lastSentToken.substring(0, 20) + '...' : 'none'
        });
        
        if (lastSentToken !== token) {
          console.log('🔵 FCM: Token changed, sending to server');
          await sendTokenToServer(token);
        } else {
          console.log('🔵 FCM: Token appears already sent, but verifying by sending anyway (debug mode)');
          await sendTokenToServer(token);
        }
      } else {
        console.log('🔴 FCM: No token received');
      }
    } catch (error) {
      console.error('❌ FCM: Error initializing FCM:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, sendTokenToServer]);

  // Handle token refresh
  const handleTokenRefresh = useCallback(async (newToken: string) => {
    console.log('🔄 FCM: Token refresh detected', { tokenStart: newToken.substring(0, 20) + '...' });
    setFcmToken(newToken);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
    await sendTokenToServer(newToken);
  }, [sendTokenToServer]);

  // Setup listeners
  useEffect(() => {
    if (!userId) return;

    let cleanup: (() => void) | undefined;

    const setupListeners = async () => {
      // Set up FCM listeners
      const unsubscribeTokenRefresh = messaging().onTokenRefresh(handleTokenRefresh);
      
      // Handle foreground messages
      const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        
        // You can handle the message here - maybe show an in-app notification
        // or update the notification context
      });

      cleanup = () => {
        unsubscribeTokenRefresh();
        unsubscribeForeground();
      };
    };

    setupListeners();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [userId, handleTokenRefresh]);

  // Initialize when user is available
  useEffect(() => {
    initializeFCM();
  }, [initializeFCM]);

  // Re-request permission if denied
  const requestPermission = useCallback(async () => {
    const hasPermission = await requestNotificationPermission();
    setPermissionGranted(hasPermission);
    
    if (hasPermission && !fcmToken) {
      const token = await getFCMToken();
      if (token) {
        setFcmToken(token);
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        await sendTokenToServer(token);
      }
    }
    
    return hasPermission;
  }, [fcmToken, sendTokenToServer]);

  return {
    fcmToken,
    permissionGranted,
    isLoading,
    requestPermission,
    sendTokenToServer
  };
}; 