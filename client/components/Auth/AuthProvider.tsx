import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { createContext, RefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { View } from 'react-native';
import { ApiError, AuthContextType, TokenTypes } from '@/types/allTypes';
import { signInWithFirebaseToken } from '@/config/firebase';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

const AuthContext = createContext<AuthContextType>({
  signIn: () => null,
  signOut: () => null,
  accessToken: null,
  refreshToken: null,
  firebaseToken: null,
  isLoading: true,
  refreshAccessToken: async () => {},
  checkAuth: async () => {},
  userId: undefined,
  isFirebaseAuthenticated: false,
});

// Access the context as a hook
export function useAuthSession() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const firebaseTokenRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState(false);
  const fadeAnim = useSharedValue(1); // Initial opacity

  // Try to authenticate with Firebase using stored token
  const authWithFirebase = useCallback(async (token: string) => {
    try {
      await signInWithFirebaseToken(token);
      setIsFirebaseAuthenticated(true);
      return true;
    } catch (error: any) {
      console.error('Firebase authentication failed during auto-login:', error);
      setIsFirebaseAuthenticated(false);
      return false;
    }
  }, []);

  useEffect(() => {
    (async (): Promise<void> => {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const firebaseToken = await SecureStore.getItemAsync('firebaseToken');
      const storedUserId = await AsyncStorage.getItem('userId');

      accessTokenRef.current = accessToken || '';
      refreshTokenRef.current = refreshToken || '';
      firebaseTokenRef.current = firebaseToken || '';
      setUserId(storedUserId || undefined);

      if (accessToken) {
        await checkAuth();
        // If we have a Firebase token, try to authenticate with it
        if (firebaseToken) {
          await authWithFirebase(firebaseToken);
        }
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

  const signIn = useCallback(async (accessToken: string, refreshToken: string, userId: string, firebaseToken?: string) => {
    fadeTransition(async () => {
      await SecureStore.setItemAsync('accessToken', accessToken);
      await AsyncStorage.setItem('userId', userId);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      setUserId(userId);

      // Store Firebase token but don't wait for authentication
      if (firebaseToken) {
        console.log('Firebase token received, length:', firebaseToken.length);
        // Store the token immediately
        await SecureStore.setItemAsync('firebaseToken', firebaseToken);
        firebaseTokenRef.current = firebaseToken;
        
        // Navigate immediately, then authenticate with Firebase in background
        router.replace('/');
        
        // Firebase authentication happens in background after navigation
        setTimeout(async () => {
          try {
            const result = await signInWithFirebaseToken(firebaseToken);
            setIsFirebaseAuthenticated(true);
            console.log('Background Firebase authentication successful');
          } catch (error: any) {
            console.error('Background Firebase authentication failed:', error.code, error.message);
            setIsFirebaseAuthenticated(false);
          }
        }, 100); // Small delay to ensure navigation completes first
      } else {
        console.log('No Firebase token provided during sign in');
        firebaseTokenRef.current = '';
        setIsFirebaseAuthenticated(false);
        await SecureStore.deleteItemAsync('firebaseToken');
        router.replace('/');
      }
    });
  }, []);

  const signOut = useCallback(async () => {
    fadeTransition(async () => {
      await SecureStore.deleteItemAsync('accessToken');
      await AsyncStorage.removeItem('userId');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('firebaseToken');
      accessTokenRef.current = null;
      refreshTokenRef.current = null;
      firebaseTokenRef.current = null;
      setUserId(undefined);
      setIsFirebaseAuthenticated(false);
      router.replace('/login');
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        accessToken: accessTokenRef,
        refreshToken: refreshTokenRef,
        firebaseToken: firebaseTokenRef,
        isLoading,
        refreshAccessToken,
        checkAuth,
        userId,
        isFirebaseAuthenticated,
      }}
    >
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </AuthContext.Provider>
  );
}