import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetMyEvents = () => {
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/my/upcoming/events');
      return response.data.events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchMyEvents, refetchMyEvents: fetchMyEvents, loading, error };
};