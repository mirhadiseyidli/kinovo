import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/utils/api';

interface Notification {
  _id: string;
  is_seen: boolean;
  type: string;
  message: string;
  created_at: string;
  data?: unknown;
}

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
  friendRequests: () => [...notificationQueryKeys.all, 'friend-requests'] as const,
};

export const useNotificationData = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: async (): Promise<Notification[]> => {
      const response = await api.get('/api/notifications');
      return response.data.notifications || [];
    },
    staleTime: 1 * 60 * 1000, // Fresh notifications needed quickly
    refetchInterval: 2 * 60 * 1000, // Background sync every 2 minutes
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await api.put('/api/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    unreadCount: (notificationsQuery.data || []).filter((n: Notification) => !n.is_seen).length,
  };
};

export const usePaginatedNotifications = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: [...notificationQueryKeys.list(), 'paginated', { page, limit }],
    queryFn: async () => {
      const response = await api.get('/api/notifications/paginated', {
        params: { page, limit }
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep previous pages when fetching new ones
  });
};