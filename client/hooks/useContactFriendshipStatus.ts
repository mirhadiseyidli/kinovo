import { useState, useCallback } from 'react';
import api from '@/utils/api';

interface ContactFriendshipStatus {
  [userId: string]: 'onKinovo' | 'alreadyFriends' | 'requestSent';
}

export const useContactFriendshipStatus = () => {
  const [friendshipStatuses, setFriendshipStatuses] = useState<ContactFriendshipStatus>({});
  const [loading, setLoading] = useState(false);

  const checkFriendshipStatus = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    setLoading(true);
    try {
      const response = await api.post('/api/managefriends/check/friendship/status', { userIds });
      const statuses = response.data.statuses;
      
      setFriendshipStatuses(prev => ({
        ...prev,
        ...statuses
      }));
    } catch (error) {
      console.error('Error checking friendship status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFriendshipStatus = useCallback((userId: string, status: 'onKinovo' | 'requestSent' | 'alreadyFriends') => {
    setFriendshipStatuses(prev => ({
      ...prev,
      [userId]: status
    }));
  }, []);

  const getFriendshipStatus = useCallback((userId: string): 'onKinovo' | 'alreadyFriends' | 'requestSent' => {
    return friendshipStatuses[userId] || 'onKinovo';
  }, [friendshipStatuses]);

  return {
    checkFriendshipStatus,
    updateFriendshipStatus,
    getFriendshipStatus,
    loading
  };
}; 