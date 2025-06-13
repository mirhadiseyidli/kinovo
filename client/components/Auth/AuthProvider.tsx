import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { createContext, RefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Animated, ActivityIndicator, View } from 'react-native';
import { ApiError, AuthContextType, TokenTypes } from '@/types/allTypes';
import { signInWithFirebaseToken } from '@/config/firebase';

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
  const fadeAnim = useState(new Animated.Value(1))[0]; // Initial opacity

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
      } else {
        setIsLoading(false);
      }
    })();
  }, []);

  const fadeTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500, // Fade out duration
      useNativeDriver: true,
    }).start(() => {
      callback(); // Perform sign-in or sign-out action
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // Fade in duration
        useNativeDriver: true,
      }).start();
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
      await SecureStore.setItemAsync('firebaseToken', firebaseToken || '');
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      firebaseTokenRef.current = firebaseToken || '';
      setUserId(userId);

      // Sign in to Firebase with custom token if provided
      if (firebaseToken) {
        try {
          await signInWithFirebaseToken(firebaseToken);
          console.log('Firebase authentication successful with custom token');
        } catch (error) {
          console.error('Firebase authentication failed:', error);
          // Continue with normal auth flow even if Firebase auth fails
        }
      }

      router.replace('/');
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
        userId
      }}
    >
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </AuthContext.Provider>
  );
};