import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetRecommendedEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId } = useAuthSession();

  const fetchRecommendedEvents = useCallback(async () => {
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/recommended');
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
      return response.data.events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch recommended events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hasDataBeenFetched]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return { 
    fetchRecommendedEvents, 
    refetchRecommendedEvents: fetchRecommendedEvents, 
    loading, 
    isFirstFetch,
    error 
  };
}; 