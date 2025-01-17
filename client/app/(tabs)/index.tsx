import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import HomeScreen from '../../components/HomeScreen';
import AuthScreen from '../(auth)/auth';
import { ThemedView } from '@/components/ThemedView';
import '../../styles/global.css'; // NativeWind styles

interface ContentProps {
  isLoggedIn: boolean;
  onLoginSuccess: (token: string) => void;
  // onLogoutSuccess: () => void;
}

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();

    const checkLoginState = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Error checking token:', error);
      } finally {
        setIsCheckingToken(false);
        await SplashScreen.hideAsync();
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

  // const handleLogout = async () => {
  //   try {
  //     await AsyncStorage.removeItem('accessToken');
  //     setIsLoggedIn(false);
  //   } catch (error) {
  //     console.error('Error during logout:', error);
  //   }
  // };

  if (isCheckingToken) {
    // Show a loading indicator while checking the token
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Content
      isLoggedIn={isLoggedIn}
      onLoginSuccess={handleLogin}
    />
  );
}

function Content({ isLoggedIn, onLoginSuccess }: ContentProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  return (
    <View
      className="flex-1 bg-gray-200"
      style={{ paddingTop: insets.top }}
    >
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      {isLoggedIn ? (
        <HomeScreen />
      ) : (
        <AuthScreen onLoginSuccess={onLoginSuccess} />
      )}
    </View>
  );
}