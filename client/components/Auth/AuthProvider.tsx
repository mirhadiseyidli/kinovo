import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { createContext, RefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/utils/api';
import { View } from 'react-native';
import { ApiError, AuthContextType, TokenTypes } from '@/types/allTypes';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { queryClient } from '@/utils/queryClient';

const AuthContext = createContext<AuthContextType>({
  signIn: () => null,
  signOut: () => null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  refreshAccessToken: async () => {},
  checkAuth: async () => {},
  userId: undefined,
});

// Access the context as a hook
export function useAuthSession() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const fadeAnim = useSharedValue(1); // Initial opacity

  useEffect(() => {
    (async (): Promise<void> => {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      // Firebase token removed - using APNs directly
      const storedUserId = await AsyncStorage.getItem('userId');

      accessTokenRef.current = accessToken || '';
      refreshTokenRef.current = refreshToken || '';
      setUserId(storedUserId || undefined);

      if (accessToken) {
        await checkAuth();
      } else {
        setIsLoading(false);
      }
    })();
  }, []);

  const fadeTransition = (callback: () => void) => {
    fadeAnim.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(callback)(); // Perform sign-in or sign-out action
      fadeAnim.value = withTiming(1, { duration: 150 });
    });
  };

  const checkAuth = async () => {
    try {
      const accessToken = accessTokenRef.current;
      if (!accessToken) throw new Error('No access token');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/check-auth`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.data.loggedIn) {
        setIsLoading(false);
      } else {
        await refreshAccessToken();
      }
    } catch (error) {
      const err = error as ApiError;
      console.error('Token check failed:', err.response?.data?.message || err.message);
      await refreshAccessToken();
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = refreshTokenRef.current;
      if (!refreshToken) {
        signOut();
        return;
      }

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh`,
        { refreshToken }
      );

      const newAccessToken = response.data.accessToken;

      if (newAccessToken) {
        await SecureStore.setItemAsync('accessToken', newAccessToken);
        accessTokenRef.current = newAccessToken;
      } else {
        signOut();
      }

      setIsLoading(false);
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to refresh access token:', err.response?.data?.message || err.message);
      signOut();
    }
  };

  const signIn = useCallback(async (accessToken: string, refreshToken: string, userId: string) => {
    fadeTransition(async () => {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await AsyncStorage.setItem('userId', userId);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      setUserId(userId);

      router.replace('/');
    });
  }, []);

  const signOut = useCallback(async () => {
    fadeTransition(async () => {
      // Send offline request and invalidate APNs token BEFORE clearing tokens (if user is logged in)
      try {
        if (accessTokenRef.current && userId) {
          // Set user offline
          await api.post('/api/push-fetch/presence/offline', {});
          
          // Invalidate APNs token to ensure clean state for next login
          await api.delete('/api/push-fetch/token');
        }
      } catch (error) {
        // Don't block logout if requests fail
      }
      
      // Clear all TanStack Query cache (both in-memory and persisted)
      queryClient.cancelQueries(); // Cancel any ongoing queries
      queryClient.clear(); // Clear in-memory cache
      
      // Clear persisted cache from AsyncStorage
      try {
        await AsyncStorage.removeItem('kinovo-query-cache');
      } catch (error) {
        console.error('Failed to clear persisted cache:', error);
      }
      
      // Clear all stored tokens and data
      await SecureStore.deleteItemAsync('accessToken');
      await AsyncStorage.removeItem('userId');
      await SecureStore.deleteItemAsync('refreshToken');
      
      // Clear APNs token data
      try {
        await AsyncStorage.removeItem('@apns_token');
        await AsyncStorage.removeItem('@apns_token_sent');
      } catch (error) {
        // Silent fail
      }
      
      accessTokenRef.current = null;
      refreshTokenRef.current = null;
      setUserId(undefined);
      
      router.replace('/login');
    });
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        accessToken: accessTokenRef,
        refreshToken: refreshTokenRef,
        isLoading,
        refreshAccessToken,
        checkAuth,
        userId,
      }}
    >
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </AuthContext.Provider>
  );
}