import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from "expo-router";
import { createContext, RefObject, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Animated, ActivityIndicator, View } from 'react-native';

interface ApiError {
  response?: {
    data?: {
      message?: unknown;
    };
  };
  message: string;
}

const AuthContext = createContext<{
  signIn: (accessToken: string, refreshToken: string) => void;
  signOut: () => void;
  accessToken: RefObject<string | null> | null;
  refreshToken: RefObject<string | null> | null;
  isLoading: boolean;
}>({
  signIn: () => null,
  signOut: () => null,
  accessToken: null,
  refreshToken: null,
  isLoading: true
});

// Access the context as a hook
export function useAuthSession() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0]; // Initial opacity

  useEffect(() => {
    (async (): Promise<void> => {
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');

      accessTokenRef.current = accessToken || '';
      refreshTokenRef.current = refreshToken || '';

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Token check failed:', (error as ApiError).response?.data?.message || error.message);
      }
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
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`,
        {}, // No request body, so send an empty object
        {
          headers: { Authorization: `Bearer ${refreshToken}` }
        }
      );

      const newAccessToken = response.data.accessToken;

      if (newAccessToken) {
        await AsyncStorage.setItem('accessToken', newAccessToken);
        accessTokenRef.current = newAccessToken;
        console.log('Access token refreshed');
      } else {
        signOut();
      }

      setIsLoading(false);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to refresh access token:', (error as ApiError).response?.data?.message || error.message);
      }
      signOut();
    }
  };

  const signIn = useCallback(async (accessToken: string, refreshToken: string) => {
    fadeTransition(async () => {
      await AsyncStorage.setItem('accessToken', accessToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      accessTokenRef.current = accessToken;
      refreshTokenRef.current = refreshToken;
      router.replace('/');
    });
  }, []);

  const signOut = useCallback(async () => {
    fadeTransition(async () => {
      await AsyncStorage.removeItem('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      accessTokenRef.current = null;
      refreshTokenRef.current = null;
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
        isLoading
      }}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          children
        )}
      </Animated.View>
    </AuthContext.Provider>
  );
};