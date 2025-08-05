import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { NotificationData, FriendRequestNotification } from '@/types/allTypes';
import { notificationQueryKeys } from './useNotificationSystem.new';

// Individual notification query hooks for specific use cases

// Get single notification by ID
export const useNotificationById = (notificationId: string) => {
  return useQuery({
    queryKey: [...notificationQueryKeys.all, 'detail', notificationId],
    queryFn: async (): Promise<NotificationData> => {
      const response = await api.get(`/api/notifications/${notificationId}`);
      return response.data.notification;
    },
    enabled: !!notificationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get notification count only (lightweight)
export const useNotificationCount = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: async (): Promise<{ total: number; unread: number }> => {
      const response = await api.get('/api/notifications/count');
      return response.data;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes
  });
};

// Infinite scroll notifications
export const useInfiniteNotifications = (limit: number = 20) => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery({
    queryKey: [...notificationQueryKeys.all, 'infinite', { limit }],
    queryFn: async ({ pageParam = 1 }) => {
      console.log('🔔 Fetching notifications page:', pageParam, 'limit:', limit);
      const response = await api.get('/api/notifications', {
        params: { page: pageParam, limit }
      });
      console.log('🔔 API response:', response.data);
      
      // Adapt the response structure to work with infinite query
      const notifications = response.data.notifications || [];
      const pagination = response.data.pagination;
      
      return {
        notifications,
        hasMore: pagination ? pageParam < pagination.pages : false,
        currentPage: pageParam,
        totalCount: pagination?.total || notifications.length,
        totalPages: pagination?.pages || 1,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      console.log('🔔 getNextPageParam:', { hasMore: lastPage.hasMore, currentPage: lastPage.currentPage });
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

// Paginated notifications hook with proper parameters
export const usePaginatedNotifications = (page: number = 1, limit: number = 20) => {
  // For infinite scroll, we ignore the page parameter and use limit
  return useInfiniteNotifications(limit);
};

// Notifications by type
export const useNotificationsByType = (type: string) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: [...notificationQueryKeys.all, 'by-type', type],
    queryFn: async (): Promise<NotificationData[]> => {
      const response = await api.get('/api/notifications/by-type', {
        params: { type }
      });
      return response.data.notifications;
    },
    enabled: !!userId && !!type,
    staleTime: 2 * 60 * 1000,
  });
};

// Recent notifications (last 24 hours)
export const useRecentNotifications = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: [...notificationQueryKeys.all, 'recent'],
    queryFn: async (): Promise<NotificationData[]> => {
      const response = await api.get('/api/notifications/recent');
      return response.data.notifications;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes for recent activity
  });
};

// Delete notification mutation
export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.delete(`/api/notifications/${notificationId}`);
      return response.data;
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update - remove notification instantly
      const queryKey = notificationQueryKeys.list();
      const previousData = queryClient.getQueryData<NotificationData[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<NotificationData[]>(queryKey,
          previousData.filter(n => n._id !== notificationId)
        );
      }
      
      return { previousData };
    },
    onError: (err, notificationId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationQueryKeys.list(), context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
};

// Batch mark notifications as read
export const useBatchMarkAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const response = await api.put('/api/notifications/mark-seen', {
        notificationIds
      });
      return response.data;
    },
    onMutate: async (notificationIds: string[]) => {
      // Optimistic update
      const queryKey = notificationQueryKeys.list();
      const previousData = queryClient.getQueryData<NotificationData[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<NotificationData[]>(queryKey,
          previousData.map(n => 
            notificationIds.includes(n._id) ? { ...n, is_seen: true } : n
          )
        );
      }
      
      return { previousData };
    },
    onError: (err, notificationIds, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationQueryKeys.list(), context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
};

// Clear all notifications (mark all as read and optionally delete old ones)
export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options: { deleteOld?: boolean; olderThanDays?: number } = {}) => {
      const response = await api.post('/api/notifications/clear-all', options);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
};

// Notification preferences
export const useNotificationPreferences = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: [...notificationQueryKeys.all, 'preferences'],
    queryFn: async () => {
      const response = await api.get('/api/notifications/preferences');
      return response.data.preferences;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - preferences don't change often
  });
};

// Update notification preferences
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      const response = await api.put('/api/notifications/preferences', {
        preferences
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [...notificationQueryKeys.all, 'preferences'] 
      });
    },
  });
};

// Export all hooks as a convenient bundle
export const notificationHooks = {
  // Queries
  useNotificationById,
  useNotificationCount,
  useInfiniteNotifications,
  useNotificationsByType,
  useRecentNotifications,
  useNotificationPreferences,
  
  // Mutations
  useDeleteNotification,
  useBatchMarkAsRead,
  useClearAllNotifications,
  useUpdateNotificationPreferences,
};