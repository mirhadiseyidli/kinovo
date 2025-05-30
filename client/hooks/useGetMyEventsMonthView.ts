import React, { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetMyEventsMonthView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyEventsMonthView = useCallback(async (month: number, year: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/manageevents/eventslist/get/my/events/month/view?month=${month}&&year=${year}`);
      return { events: response.data.events };
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch month view events:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchMyEventsMonthView, refetchMyEventsMonthView: fetchMyEventsMonthView, loading, error };
};