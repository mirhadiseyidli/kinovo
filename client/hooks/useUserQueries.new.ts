import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

export const userQueryKeys = {
  all: ['users'] as const,
  currentUser: () => [...userQueryKeys.all, 'current'] as const,
  userProfile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  userActivities: (userId: string) => [...userQueryKeys.all, 'activities', userId] as const,
  friends: () => [...userQueryKeys.all, 'friends'] as const,
  favoriteActivities: () => [...userQueryKeys.all, 'activities'] as const,
};

// Current user data
export const useUserData = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: userQueryKeys.currentUser(),
    queryFn: async () => {
      const response = await api.get('/api/users/me');
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Friends data
export const useGetMyFriends = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: userQueryKeys.friends(),
    queryFn: async () => {
      const response = await api.get('/api/managefriends/user/get/friends');
      return response.data.friends || [];
    },
    enabled: !!userId, // Only fetch when authenticated
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Favorite activities mutation
export const useFavoriteActivities = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();

  return useMutation({
    mutationFn: async (activities: string[]) => {
      const response = await api.put('/api/users/favorite-activities', { activities });
      return response.data;
    },
    onSuccess: (data) => {
      // Update user cache
      queryClient.setQueryData(userQueryKeys.currentUser(), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          favorite_activities: data.favorite_activities
        };
      });
      
      // Invalidate events that depend on activities (recommended)
      queryClient.invalidateQueries({ queryKey: ['events', 'recommended', userId] });
    },
  });
};

// User activities (for viewing other users' activities)
export const useGetUserToViewActivities = (userId?: string) => {
  return useQuery({
    queryKey: userQueryKeys.userActivities(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const response = await api.get(`/api/users/user/get/profile?_id=${userId}`);
      return response.data.user;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    select: (userData) => ({
      userToView: userData,
      activities: userData.favorite_activities || []
    }),
  });
};