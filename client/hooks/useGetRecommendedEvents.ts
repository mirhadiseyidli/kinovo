import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchRecommendedEvents = useCallback(async () => {
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/recommended', {
        signal: abortControllerRef.current.signal
      });
      
      if (mountedRef.current) {
        setIsFirstFetch(false); // First fetch completed
        setHasDataBeenFetched(true);
      }
      return response.data.events;
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return [];
      }
      
      console.error('Failed to fetch recommended events:', err.message);
      if (mountedRef.current) {
        setError(err.message);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
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