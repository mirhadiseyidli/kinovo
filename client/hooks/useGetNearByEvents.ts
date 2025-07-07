import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetNearByEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);

  const fetchNearByEvents = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    if (!lat || !lng) return [];
    
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`);
      const events = response.data.events;
      
      // Ensure data is processed before setting loading to false
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch nearby events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hasDataBeenFetched]);

  return { 
    fetchNearByEvents, 
    refetchNearByEvents: fetchNearByEvents, 
    loading, 
    isFirstFetch,
    error 
  };
};