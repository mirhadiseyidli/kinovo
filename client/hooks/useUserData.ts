import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";

export const useUserData = () => {
  const { refreshAccessToken } = useAuthSession();

  const fetchUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data;
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
        const retryAccessToken = await AsyncStorage.getItem('accessToken');
        if (!retryAccessToken) throw new Error('No access token available');

        const retryResponse = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${retryAccessToken}` },
        });

        return retryResponse.data;
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
      }
    }
  };

  return { fetchUserData, refetchUser: fetchUserData };
};