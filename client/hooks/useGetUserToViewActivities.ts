import { useState, useCallback } from 'react';
import api from '@/utils/api';
import { User } from '@/types/allTypes';

export const useGetUserToViewActivities = (userId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userToView, setUserToView] = useState<User | null>(null);
  const [activities, setActivities] = useState<string[]>([]);

  const fetchUserToViewActivities = useCallback(async (id?: string) => {
    const targetUserId = id || userId;
    if (!targetUserId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/users/user/get/profile?_id=${targetUserId}`);
      const userData: User = response.data.user;
      setUserToView(userData);
      setActivities(userData.favorite_activities || []);
    } catch (err: any) {
      console.error('Error fetching user activities:', err);
      setError(err.message || 'Failed to fetch user activities');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    userToView,
    activities,
    fetchUserToViewActivities
  };
}; 