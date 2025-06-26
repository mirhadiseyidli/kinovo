import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { upcomingEventsCache } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetMyEvents = () => {
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthSession();

  const fetchMyEvents = useCallback(async (fromHomeScreen: boolean = false, forceRefresh: boolean = false) => {
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheParams = { fromHomeScreen };
      const cachedEvents = upcomingEventsCache.get(userId, cacheParams);
      if (cachedEvents) {
        console.log('📦 [Cache Hit] Upcoming events loaded from cache');
        setMyEventsList(cachedEvents);
        return cachedEvents;
      }
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🌐 [API Call] Fetching upcoming events from server');
      const queryParams = fromHomeScreen ? '?from_home_screen=true' : '';
      const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events${queryParams}`);
      
      const events = response.data.events || [];
      
      // Cache the results
      const cacheParams = { fromHomeScreen };
      upcomingEventsCache.set(userId, events, cacheParams);
      console.log(`💾 [Cache Set] Cached ${events.length} upcoming events`);
      
      setMyEventsList(events);
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('❌ Failed to fetch upcoming events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      upcomingEventsCache.clear(userId);
      console.log('🗑️ [Cache Clear] Upcoming events cache cleared');
    }
  }, [userId]);

  return { 
    fetchMyEvents, 
    refetchMyEvents: fetchMyEvents, 
    loading, 
    error, 
    clearCache,
    myEventsList 
  };
};