import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetNearByEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchNearByEvents = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    if (!lat || !lng) return [];
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`);
      const events = response.data.events;
      
      // Ensure data is processed before setting loading to false
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch nearby events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isInitialLoad]);

  return { fetchNearByEvents, refetchNearByEvents: fetchNearByEvents, loading: loading || isInitialLoad, error };
};