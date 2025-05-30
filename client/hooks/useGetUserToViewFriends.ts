import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Friend } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetUserToViewFriends = (_id: string) => {
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserToViewFriends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/managefriends/user/get/user/to/view/friends?_id=${_id}`);
      setFriendsList(response.data.friends);
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch friends:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [_id]);

  return { friendsList, fetchUserToViewFriends, loading, error };
};