import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetNearByEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearByEvents = useCallback(async (lat: number | null, lng: number | null, distance: number = 50) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`);
      return response.data.events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch nearby events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchNearByEvents, refetchNearByEvents: fetchNearByEvents, loading, error };
};