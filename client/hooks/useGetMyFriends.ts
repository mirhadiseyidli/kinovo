import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Friend } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetMyFriends = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/managefriends/user/get/friends');
      return response.data.friends;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch friends:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchFriends, refetchFriends: fetchFriends, loading, error };
};