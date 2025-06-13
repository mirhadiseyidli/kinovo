import { useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api';
import { Event, ApiError } from '@/types/allTypes';

export const useGetFriendsEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriendsEvents = async (): Promise<Event[] | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/manageevents/eventslist/friends');
      setLoading(false);
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch friends\' events';
      console.error('Failed to fetch friends\' events:', error);
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return {
    fetchFriendsEvents,
    loading,
    error
  };
}; 