import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { userQueryKeys } from './useUserQueries.new';
import { queryKeys } from '@/utils/queryKeys.new';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useFriendMutations = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();

  const sendFriendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await api.post('/api/friends/request', { userId: targetUserId });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate friends and friend requests
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'friend-requests'] });
    },
  });

  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`/api/friends/accept/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'friend-requests'] });
      // Invalidate friends events since friend list changed
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsEvents(userId || '') });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await api.delete(`/api/friends/${friendId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
    },
  });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
  };
};