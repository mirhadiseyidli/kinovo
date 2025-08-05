import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { NotificationData, FriendRequestNotification } from '@/types/allTypes';
import { useBadgeManager } from '@/hooks/useBadgeManager';
import { useCallback, useEffect, useMemo } from 'react';

// Query keys for notifications
export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  friendRequests: () => [...notificationQueryKeys.all, 'friend-requests'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
  paginated: (page: number, limit: number) => [...notificationQueryKeys.all, 'paginated', { page, limit }] as const,
};

// Core notifications query with real-time sync
export const useNotificationData = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: async (): Promise<NotificationData[]> => {
      const response = await api.get('/api/push-fetch/notifications');
      return response.data.success ? response.data.data : [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // Fresh for 30 seconds
    refetchInterval: 60 * 1000, // Background sync every minute
    refetchOnWindowFocus: true, // Sync when app comes to foreground
    refetchOnMount: true, // Sync when component mounts
    refetchOnReconnect: true, // Sync when network reconnects
  });
};

// Friend requests query with real-time sync
export const useFriendRequestData = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: notificationQueryKeys.friendRequests(),
    queryFn: async (): Promise<FriendRequestNotification[]> => {
      const response = await api.get('/api/push-fetch/friend-requests');
      return response.data.success ? response.data.data : [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
};

// Paginated notifications for notifications page
export const usePaginatedNotifications = (page: number = 1, limit: number = 20) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: notificationQueryKeys.paginated(page, limit),
    queryFn: async () => {
      const response = await api.get('/api/notifications/paginated', {
        params: { page, limit }
      });
      return response.data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep previous pages when fetching new ones
  });
};

// Mark notification as read mutation
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put('/api/notifications/mark-seen', {
        notificationIds: [notificationId]
      });
      return response.data;
    },
    onMutate: async (notificationId: string) => {
      // Optimistic update - instantly update UI
      const queryKey = notificationQueryKeys.list();
      const previousData = queryClient.getQueryData<NotificationData[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<NotificationData[]>(queryKey, 
          previousData.map(n => 
            n._id === notificationId ? { ...n, is_seen: true } : n
          )
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
      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount() });
    },
  });
};

// Mark all notifications as read mutation
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.put('/api/notifications/mark-seen', {});
      return response.data;
    },
    onMutate: async () => {
      // Optimistic update - mark all as read instantly
      const queryKey = notificationQueryKeys.list();
      const previousData = queryClient.getQueryData<NotificationData[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<NotificationData[]>(queryKey,
          previousData.map(n => ({ ...n, is_seen: true }))
        );
      }
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationQueryKeys.list(), context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate all notification-related queries
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
};

// Accept friend request mutation
export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (senderId: string) => {
      const response = await api.post('/api/friends/accept', { senderId });
      return response.data;
    },
    onMutate: async (senderId: string) => {
      // Optimistic update - remove friend request instantly
      const queryKey = notificationQueryKeys.friendRequests();
      const previousData = queryClient.getQueryData<FriendRequestNotification[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<FriendRequestNotification[]>(queryKey,
          previousData.filter(req => req.sender._id !== senderId)
        );
      }
      
      return { previousData };
    },
    onError: (err, senderId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationQueryKeys.friendRequests(), context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.friendRequests() });
      queryClient.invalidateQueries({ queryKey: ['friends'] }); // Invalidate friends list
    },
  });
};

// Decline friend request mutation
export const useDeclineFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (senderId: string) => {
      const response = await api.post('/api/friends/decline', { senderId });
      return response.data;
    },
    onMutate: async (senderId: string) => {
      // Optimistic update - remove friend request instantly
      const queryKey = notificationQueryKeys.friendRequests();
      const previousData = queryClient.getQueryData<FriendRequestNotification[]>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<FriendRequestNotification[]>(queryKey,
          previousData.filter(req => req.sender._id !== senderId)
        );
      }
      
      return { previousData };
    },
    onError: (err, senderId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(notificationQueryKeys.friendRequests(), context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate friend requests
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.friendRequests() });
    },
  });
};

// Format notification content (same as original)
export const useNotificationFormatter = () => {
  return useCallback((notification: NotificationData) => {
    let title = "";
    let subtitle = "";

    if (!notification) return { title: "New notification" };

    const senderName = notification.sender?.full_name || "Someone";

    switch (notification.type) {
      case 'friend_request_accepted':
        title = `${senderName} accepted your friend request`;
        break;
      case 'new_event_from_friend':
        title = `${senderName} created a new event`;
        subtitle = notification.event?.title || 'Check it out!';
        break;
      case 'event_invitation':
        title = `You're invited to "${notification.event?.title || 'an event'}"`;
        subtitle = `Invited by ${senderName}`;
        break;
      case 'event_updated':
        title = `Event updated: ${notification.event?.title || 'An event was updated'}`;
        subtitle = 'Details may have changed';
        break;
      case 'event_attendance_confirmed':
        title = `${senderName} is attending the event`;
        subtitle = notification.event?.title || 'Check who\'s coming';
        break;
      case 'event_reminder_10_mins':
        title = `Reminder: ${notification.event?.title || 'Upcoming event'}`;
        subtitle = 'Your event is coming up soon';
        break;
      case 'event_reminder_1_hour':
        title = `Reminder: ${notification.event?.title || 'Upcoming event'}`;
        subtitle = 'Your event is coming up soon';
        break;
      case 'new_event_nearby':
        title = `New event nearby you might be interested in`;
        subtitle = notification.event?.title || 'Check it out!';
        break;
      case 'someone_from_contacts_joined':
        title = `${senderName} from your contacts joined Kinovo`;
        subtitle = 'Connect with them now!';
        break;
      default:
        title = notification.title || notification.type || "New notification";
        subtitle = notification.subtitle || '';
        break;
    }

    return { title, subtitle };
  }, []);
};

// Main notification system hook - replaces useNotifications context
export const useNotificationSystem = () => {
  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useNotificationData();
  const { data: friendRequests = [], isLoading: friendRequestsLoading, refetch: refetchFriendRequests } = useFriendRequestData();
  
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const formatNotification = useNotificationFormatter();
  
  const { updateBadgeCount } = useBadgeManager();
  const queryClient = useQueryClient();

  // Sort notifications by creation time (newest first)
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications]);

  // Sort friend requests by creation time (newest first)
  const sortedFriendRequests = useMemo(() => {
    return [...friendRequests].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [friendRequests]);

  // Calculate counts
  const unseenNotificationsCount = useMemo(() => {
    return sortedNotifications.filter(n => !n.is_seen).length;
  }, [sortedNotifications]);

  const unseenFriendRequestsCount = useMemo(() => {
    return sortedFriendRequests.length; // All friend requests are unseen until acted upon
  }, [sortedFriendRequests]);

  const totalUnseenCount = unseenNotificationsCount + unseenFriendRequestsCount;

  // Update app badge when counts change
  useEffect(() => {
    updateBadgeCount(totalUnseenCount);
  }, [totalUnseenCount, updateBadgeCount]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.allSettled([
      refetchNotifications(),
      refetchFriendRequests()
    ]);
  }, [refetchNotifications, refetchFriendRequests]);

  // Handle push notification received - instantly refresh relevant data
  const handlePushNotificationReceived = useCallback((notificationData: any) => {
    const type = notificationData?.type;
    
    if (type === 'friend_request' || type === 'friend_request_accepted') {
      // Invalidate friend requests for instant update
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.friendRequests() });
    } else if (type && type.includes('event')) {
      // Invalidate notifications for instant update
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    } else {
      // Invalidate all notification data
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    }
  }, [queryClient]);

  return {
    // Data
    notifications: sortedNotifications,
    friendRequests: sortedFriendRequests,
    
    // Loading states
    loading: notificationsLoading || friendRequestsLoading,
    
    // Counts
    unseenNotificationsCount,
    unseenFriendRequestsCount,
    totalNotificationCount: sortedNotifications.length + sortedFriendRequests.length,
    totalUnseenCount,
    
    // Actions
    markNotificationAsRead: markAsRead.mutate,
    markAllNotificationsAsRead: markAllAsRead.mutate,
    handleAcceptFriendRequest: acceptFriendRequest.mutate,
    handleDeclineFriendRequest: declineFriendRequest.mutate,
    refreshData,
    handlePushNotificationReceived,
    getFormattedNotificationContent: formatNotification,
    
    // Loading states for actions
    markingAsRead: markAsRead.isPending,
    markingAllAsRead: markAllAsRead.isPending,
    acceptingFriendRequest: acceptFriendRequest.isPending,
    decliningFriendRequest: declineFriendRequest.isPending,
  };
};