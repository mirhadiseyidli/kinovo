import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { User } from '@/types/allTypes';

export const useUserData = () => {
  const { signOut } = useAuthSession();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setUser(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
        logout();
      }
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      await fetchUserData();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  const logout = () => {
    signOut();
  }

  return { user, refetchUser: fetchUserData };
};