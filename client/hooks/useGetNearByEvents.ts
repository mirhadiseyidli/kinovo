import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetNearByEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchNearByEvents = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    if (!lat || !lng) return [];
    
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
      const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`, {
        signal: abortControllerRef.current.signal
      });
      const events = response.data.events;
      
      // Ensure data is processed before setting loading to false
      await new Promise(resolve => {
        delayTimeoutRef.current = setTimeout(resolve, 100) as ReturnType<typeof setTimeout>;
      });
      
      if (mountedRef.current) {
        setIsFirstFetch(false); // First fetch completed
        setHasDataBeenFetched(true);
      }
      return events;
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return [];
      }
      
      console.error('Failed to fetch nearby events:', err.message);
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

  // New function to get only first 5 nearby events for carousel preview
  const fetchNearByEventsPreview = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    if (!lat || !lng) return [];
    
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
      const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`, {
        signal: abortControllerRef.current.signal
      });
      const events = response.data.events;
      
      // Return only first 5 events for preview
      const previewEvents = events.slice(0, 5);
      
      // Ensure data is processed before setting loading to false
      await new Promise(resolve => {
        delayTimeoutRef.current = setTimeout(resolve, 100) as ReturnType<typeof setTimeout>;
      });
      
      if (mountedRef.current) {
        setIsFirstFetch(false); // First fetch completed
        setHasDataBeenFetched(true);
      }
      return { events: previewEvents, totalCount: events.length };
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return { events: [], totalCount: 0 };
      }
      
      console.error('Failed to fetch nearby events preview:', err.message);
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

  return { 
    fetchNearByEvents, 
    fetchNearByEventsPreview,
    refetchNearByEvents: fetchNearByEvents, 
    loading, 
    isFirstFetch,
    error 
  };
};