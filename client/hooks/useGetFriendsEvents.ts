import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api';
import { Event, ApiError } from '@/types/allTypes';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetFriendsEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId } = useAuthSession();

  const fetchFriendsEvents = async (): Promise<Event[] | null> => {
    console.log('fetchFriendsEvents');
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/manageevents/eventslist/friends');
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
      setLoading(false);
      console.log('response.data', response.data);
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

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return {
    fetchFriendsEvents,
    loading,
    isFirstFetch,
    error
  };
}; 