import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetUserToViewEvents = (_id: string) => {
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId } = useAuthSession();

  const fetchUserToViewEvents = useCallback(async () => {
    if (!_id) {
      console.error('fetchUserToViewEvents called without a valid user ID');
      setError('No user ID provided');
      return;
    }

    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/user/events?_id=${_id}`);
      setEventsList(response.data.events || []);
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
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

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return { eventsList, fetchUserToViewEvents, loading, isFirstFetch, error };
};