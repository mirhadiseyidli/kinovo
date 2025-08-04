import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { createContext, RefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { View } from 'react-native';
import { ApiError, AuthContextType, TokenTypes } from '@/types/allTypes';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';
import { queryClient } from '@/utils/queryClient';
import { asyncStoragePersister } from '@/utils/persistedQueryClient';

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
      // Send offline request BEFORE clearing tokens (if user is logged in)
      try {
        if (accessTokenRef.current && userId) {
          await axios.post(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/push-fetch/presence/offline`,
            {},
            {
              headers: { Authorization: `Bearer ${accessTokenRef.current}` },
              timeout: 3000 // 3 second timeout for logout
            }
          );
        }
      } catch (error) {
        console.warn('Failed to set user offline during logout:', error);
        // Don't block logout if offline request fails
      }
      
      // Clear all TanStack Query cache (in-memory)  
      queryClient.clear();
      
      // Force complete cache reset by invalidating everything
      await queryClient.invalidateQueries();
      
      // Remove all queries from cache
      queryClient.removeQueries();
      
      // Clear persistent cache from AsyncStorage
      try {
        // Primary method: Clear all AsyncStorage keys that might contain cached data
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter(key => 
          key.includes('cache') || 
          key.includes('query') || 
          key.includes('events') ||
          key.includes('KINOVO') ||
          key.includes('REACT_QUERY')
        );
        
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
        
        // Also try the persister method as secondary cleanup
        try {
          await asyncStoragePersister.removeClient();
        } catch (persisterError) {
          // Ignore persister errors - the manual cleanup above should handle it
        }
        
      } catch (error) {
        console.error('Error clearing cache keys:', error);
        
        // Ultimate fallback: try to clear the main cache key directly
        try {
          await AsyncStorage.removeItem('KINOVO_REACT_QUERY_OFFLINE_CACHE');
        } catch (fallbackError) {
          console.error('Ultimate fallback cache clearing also failed:', fallbackError);
        }
      }
      
      // Clear all stored tokens and data
      await SecureStore.deleteItemAsync('accessToken');
      await AsyncStorage.removeItem('userId');
      await SecureStore.deleteItemAsync('refreshToken');
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