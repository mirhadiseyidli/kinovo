'/eventslist/event/get/event/by/id'

import React, { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { ApiError, Event } from '@/types/allTypes';

export const useGetEventById = (_id: string) => {
  const { refreshAccessToken } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventById = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/event/get/event/by/id?_id=${_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data.found_event;
    } catch (error) {
      const err = error as ApiError;
      if (err.response?.status === 401) {
        try {
          await refreshAccessToken();
          const retryToken = await AsyncStorage.getItem('accessToken');
          const retryResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/event/get/event/by/id?_id=${_id}`,
            { headers: { Authorization: `Bearer ${retryToken}` } }
          );
          
          return retryResponse.data.found_event;
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError);
          setError('Failed to refresh access token.');
        }
      } else {
        console.error('Failed to fetch event data:', err.message);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  return { fetchEventById, refetchEventById: fetchEventById, loading, error };
};