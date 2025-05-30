import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetMyPastEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyPastEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/my/past/events');
      return response.data.past_events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch past events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchMyPastEvents, refetchMyPastEvents: fetchMyPastEvents, loading, error };
};