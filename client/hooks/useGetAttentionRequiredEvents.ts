import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { attentionRequiredCache } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetAttentionRequiredEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthSession();

  const fetchAttentionRequiredEvents = useCallback(async (fromHomeScreen: boolean = false, forceRefresh: boolean = false) => {
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheParams = { fromHomeScreen };
      const cachedEvents = attentionRequiredCache.get(userId, cacheParams);
      if (cachedEvents) {
        console.log('📦 [Cache Hit] Attention required events loaded from cache');
        return cachedEvents;
      }
    }

    setLoading(true);
    setError(null);
    try {
      console.log('🌐 [API Call] Fetching attention required events from server');
      const queryParams = fromHomeScreen ? '?from_home_screen=true' : '';
      const response = await api.get(`/api/manageevents/eventslist/get/attention/required${queryParams}`);
      
      const events = response.data.events || [];
      
      // Cache the results
      const cacheParams = { fromHomeScreen };
      attentionRequiredCache.set(userId, events, cacheParams);
      console.log(`💾 [Cache Set] Cached ${events.length} attention required events`);
      
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('❌ Failed to fetch attention required events:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      attentionRequiredCache.clear(userId);
      console.log('🗑️ [Cache Clear] Attention required events cache cleared');
    }
  }, [userId]);

  return { 
    fetchAttentionRequiredEvents, 
    loading, 
    error, 
    clearCache 
  };
}; 