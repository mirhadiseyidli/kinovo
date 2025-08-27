import { useEffect, useCallback, useState, useRef } from 'react';
import { Platform, Alert, AppState, AppStateStatus } from 'react-native';
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
  const { userId, refreshToken } = useAuthSession();
  const appState = useRef(AppState.currentState);
  const lastTokenCheck = useRef<Date>(new Date());
  const isRegistering = useRef<boolean>(false); // Prevent multiple simultaneous registrations

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

  // Force refresh token
  const forceRefreshToken = useCallback(async (): Promise<string | null> => {
    try {
      // Request new token from iOS
      const newToken = await getAPNsToken();
      if (newToken) {
        setApnsToken(newToken);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, newToken);
        return newToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [getAPNsToken]);

  // Send token to server
  const sendTokenToServer = useCallback(async (token: string, isRetry: boolean = false, source: string = 'unknown'): Promise<boolean> => {
    if (!userId || !token || isRegistering.current) {
      return false;
    }

    isRegistering.current = true;
    
    try {
      await api.post('/api/push-fetch/token', {
        token
      });
      
      // Mark token as sent
      await AsyncStorage.setItem(APNS_TOKEN_SENT_KEY, token);
      return true;
    } catch (error: any) {
      // Check if token is marked as invalid (410 Gone or specific error code)
      if (!isRetry && (error?.status === 410 || error?.response?.data?.code === 'INVALID_APN_TOKEN')) {
        // Get a fresh token
        const newToken = await forceRefreshToken();
        if (newToken && newToken !== token) {
          // Retry with the new token (reset flag first)
          isRegistering.current = false;
          return sendTokenToServer(newToken, true);
        }
      }
      
      return false;
    } finally {
      isRegistering.current = false;
    }
  }, [userId, forceRefreshToken]);

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
          await sendTokenToServer(token, false, 'initializeAPNs-new-token');
        } else {
          await sendTokenToServer(token, false, 'initializeAPNs-existing-token');
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
        sendTokenToServer(token.data, false, 'push-token-listener');
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
      backgroundSubscription.remove();
    };
  }, [sendTokenToServer]);

  // Validate and refresh token if needed
  const validateAndRefreshToken = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Check if we have a token stored
      const storedToken = await AsyncStorage.getItem(APNS_TOKEN_KEY);
      
      if (!storedToken || !permissionGranted) {
        // No token or no permission, reinitialize
        await initializeAPNs();
        return;
      }
      
      // Check if token is still valid by getting current token
      const currentToken = await getAPNsToken();
      
      if (currentToken && currentToken !== storedToken) {
        // Token has changed, update it
        setApnsToken(currentToken);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, currentToken);
        await sendTokenToServer(currentToken);
      } else if (!currentToken && storedToken) {
        // Lost token somehow, reinitialize
        await initializeAPNs();
      }
    } catch (error) {
      // Silent fail, will retry on next check
    }
  }, [userId, permissionGranted, getAPNsToken]); // Remove dependencies that cause loops

  // Handle app state changes (foreground/background)
  useEffect(() => {
    if (!userId) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        const now = new Date();
        const timeSinceLastCheck = now.getTime() - lastTokenCheck.current.getTime();
        
        // Check token if it's been more than 30 minutes
        if (timeSinceLastCheck > 30 * 60 * 1000) {
          validateAndRefreshToken();
          lastTokenCheck.current = now;
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [userId, validateAndRefreshToken]);

  // Initialize when user is available or changes (login/logout)
  useEffect(() => {
    if (!userId) {
      // User logged out, reset state
      setApnsToken(null);
      setPermissionGranted(false);
      setIsLoading(false);
      return;
    }

    // User logged in or changed, initialize APNs
    initializeAPNs();
  }, [userId, initializeAPNs]);

  // Handle login token refresh - only when refresh token changes (actual login/logout)
  useEffect(() => {
    if (!userId || !refreshToken?.current) {
      return;
    }
    
    // Only do login refresh when we actually have a refresh token (user just logged in)
    const timer = setTimeout(async () => {
      try {
        const storedToken = await AsyncStorage.getItem(APNS_TOKEN_KEY);
        
        if (storedToken) {
          // Check permission dynamically instead of relying on state
          const { status } = await Notifications.getPermissionsAsync();
          const hasPermission = status === 'granted';
          
          if (hasPermission) {
            // Force re-registration of existing token with new user
            await sendTokenToServer(storedToken, false, 'login-refresh-existing');
          } else {
            // Request permission and then register token
            const hasNewPermission = await requestNotificationPermission();
            if (hasNewPermission) {
              await sendTokenToServer(storedToken, false, 'login-refresh-after-permission');
            }
          }
        }
      } catch (error) {
        console.error('❌ APNs: Error during login token refresh:', error);
        // Silent fail, normal initialization will handle it
      }
    }, 15000); // 15 second delay to let everything settle

    return () => clearTimeout(timer);
  }, [refreshToken?.current]); // Depend on refresh token value, not userId

  // Setup listeners
  useEffect(() => {
    if (!userId) return;
    return setupNotificationListeners();
  }, [userId, setupNotificationListeners]);

  // Periodic token health check (every hour when app is active)
  useEffect(() => {
    if (!userId || !permissionGranted) return;

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        validateAndRefreshToken();
      }
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, [userId, permissionGranted, validateAndRefreshToken]);

  // Re-request permission if denied
  const requestPermission = useCallback(async () => {
    const hasPermission = await requestNotificationPermission();
    setPermissionGranted(hasPermission);
    
    if (hasPermission && !apnsToken) {
      const token = await getAPNsToken();
      if (token) {
        setApnsToken(token);
        await AsyncStorage.setItem(APNS_TOKEN_KEY, token);
        await sendTokenToServer(token, false, 'request-permission');
      }
    }
    
    return hasPermission;
  }, [apnsToken, sendTokenToServer, requestNotificationPermission, getAPNsToken]);

  // Invalidate token on logout
  const invalidateToken = useCallback(async () => {
    try {
      // Call server endpoint to invalidate token
      await api.delete('/api/push-fetch/token');
      
      // Clear local storage
      await AsyncStorage.removeItem(APNS_TOKEN_KEY);
      await AsyncStorage.removeItem(APNS_TOKEN_SENT_KEY);
      
      // Clear state
      setApnsToken(null);
      
      return true;
    } catch (error) {
      // Silent fail - user is logging out anyway
      return false;
    }
  }, []);

  return {
    apnsToken,
    permissionGranted,
    isLoading,
    requestPermission,
    sendTokenToServer,
    invalidateToken
  };
};