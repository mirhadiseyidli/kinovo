import { useState, useCallback, useEffect } from 'react';
import api from '@/utils/api';
import { User } from '@/types/allTypes';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetUserToViewActivities = (userId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId: currentUserId } = useAuthSession();

  const fetchUserToViewActivities = useCallback(async (id?: string) => {
    const targetUserId = id || userId;
    if (!targetUserId) return;

    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/users/user/get/profile?_id=${targetUserId}`);
      const userData: User = response.data.user;
      setUserToView(userData);
      setActivities(userData.favorite_activities || []);
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
    } catch (err: any) {
      console.error('Error fetching user activities:', err);
      setError(err.message || 'Failed to fetch user activities');
    } finally {
      setLoading(false);
    }
  }, [userId, hasDataBeenFetched]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (currentUserId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [currentUserId]);

  return {
    loading,
    error,
    userToView,
    activities,
    isFirstFetch,
    fetchUserToViewActivities
  };
}; 