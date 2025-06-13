import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetUserToViewEvents = (_id: string) => {
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserToViewEvents = useCallback(async () => {
    if (!_id) {
      console.error('fetchUserToViewEvents called without a valid user ID');
      setError('No user ID provided');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/user/events?_id=${_id}`);
      setEventsList(response.data.events || []);
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch user events:', err.message);
      if (err.message.includes('timeout')) {
        console.error('API request timed out. Check server performance or network connectivity.');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [_id]);

  return { eventsList, fetchUserToViewEvents, loading, error };
};