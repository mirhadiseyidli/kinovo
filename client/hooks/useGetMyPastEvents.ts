import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { pastEventsCache } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetMyPastEvents = () => {
  const [loading, setLoading] = useState(false);
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
        console.log('📦 [Cache Hit] Past events loaded from cache');
        return cachedEvents;
      }
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🌐 [API Call] Fetching past events from server');
      const response = await api.get('/api/manageevents/eventslist/get/my/past/events');
      
      const events = response.data.past_events || [];
      
      // Cache the results
      pastEventsCache.set(userId, events);
      console.log(`💾 [Cache Set] Cached ${events.length} past events`);
      
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('❌ Failed to fetch past events:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      pastEventsCache.clear(userId);
      console.log('🗑️ [Cache Clear] Past events cache cleared');
    }
  }, [userId]);

  return { 
    fetchMyPastEvents, 
    loading, 
    error, 
    clearCache 
  };
};