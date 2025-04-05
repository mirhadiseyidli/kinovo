import React, { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { ApiError, Friend } from '@/types/allTypes';

export const useGetUserToViewFriends = (_id: string) => {
  const { refreshAccessToken } = useAuthSession();
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserToViewFriends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/user/to/view/friends?_id=${_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFriendsList(response.data.friends);
    } catch (error) {
      const err = error as ApiError;
      if (err.response?.status === 401) {
        try {
          await refreshAccessToken();
          const retryToken = await AsyncStorage.getItem('accessToken');
          const retryResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/user/to/view/friends?_id=${_id}`,
            { headers: { Authorization: `Bearer ${retryToken}` } }
          );
          setFriendsList(retryResponse.data.friends);
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError);
          setError('Failed to refresh access token.');
        }
      } else {
        console.error('Failed to fetch friends:', err.message);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    fetchUserToViewFriends();
  }, [fetchUserToViewFriends]);

  return { friendsList, fetchUserToViewFriends, refetchUserToViewFriends: fetchUserToViewFriends, loading, error };
};