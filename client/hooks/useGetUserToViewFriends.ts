import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Friend } from '@/types/allTypes';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetUserToViewFriends = (_id: string) => {
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId } = useAuthSession();

  const fetchUserToViewFriends = useCallback(async () => {
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/managefriends/user/get/user/to/view/friends?_id=${_id}`);
      setFriendsList(response.data.friends);
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch friends:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [_id, hasDataBeenFetched]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return { friendsList, fetchUserToViewFriends, loading, isFirstFetch, error };
};