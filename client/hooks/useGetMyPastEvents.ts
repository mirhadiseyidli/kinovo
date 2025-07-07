import React, { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { pastEventsCache } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetMyPastEvents = () => {
  const [loading, setLoading] = useState(false);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthSession();

  const fetchMyPastEvents = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedEvents = pastEventsCache.get(userId);
      if (cachedEvents) {
        setIsFirstFetch(false); // We have data, so no longer first fetch
        setHasDataBeenFetched(true);
        return cachedEvents;
      }
    }

    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/my/past/events');
      
      const events = response.data.past_events || [];
      
      // Cache the results
      pastEventsCache.set(userId, events);
      
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('❌ Failed to fetch past events:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, hasDataBeenFetched]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      pastEventsCache.clear(userId);
    }
  }, [userId]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return { 
    fetchMyPastEvents, 
    loading, 
    isFirstFetch,
    error, 
    clearCache 
  };
};