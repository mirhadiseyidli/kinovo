import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetAttentionRequiredEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttentionRequiredEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/manageevents/eventslist/get/attention/required');
      return response.data.events;
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch attention required events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    fetchAttentionRequiredEvents, 
    refetchAttentionRequiredEvents: fetchAttentionRequiredEvents, 
    loading, 
    error 
  };
}; 