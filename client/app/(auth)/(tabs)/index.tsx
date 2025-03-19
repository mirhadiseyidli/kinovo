import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';
import HomeScreen from '../../../components/Home/HomeScreen';
import AuthScreen from '../../login';
import { ThemedView } from '@/components/ThemedView';

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    const checkLoginState = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Error checking token:', error);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkLoginState();
  }, []);

  const handleLogin = async (token: string) => {
    try {
      await AsyncStorage.setItem('accessToken', token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  if (isCheckingToken) {
    // Show a loading indicator while checking the token
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Content />
  );
};

function Content() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
        <HomeScreen />
    </ThemedView>
  );
}
