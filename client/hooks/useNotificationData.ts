import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

interface NotificationData {
  _id: string;
  title: string;
  subtitle?: string;
  message_body: string;
  type: string;
  status: string;
  is_seen: boolean;
  created_at: string;
  updated_at: string;
  event?: {
    _id: string;
    title: string;
    category: string;
    start_time: string;
    end_time: string;
    location?: string;
  };
  sender?: {
    _id: string;
    full_name: string;
    username: string;
    profile_picture?: string;
  };
  friend_request?: any;
  data?: Record<string, any>;
  count?: number;
}

interface FriendRequestData {
  _id: string;
  from: {
    _id: string;
    full_name: string;
    username: string;
    profile_picture?: string;
  };
  to: string;
  status: string;
  created_at: string;
}

export function useNotificationData() {
  const { userId } = useAuthSession();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const mountedRef = useRef(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (!userId || !mountedRef.current) return;

    try {
      if (showLoading) setLoading(true);
      
      const response = await api.get('/api/push-fetch/notifications');
      
      if (mountedRef.current && response.data.success) {
        setNotifications(response.data.data);
        console.log('📬 Notifications: Fetched', response.data.count, 'notifications');
        setError(null);
      }
    } catch (error) {
      console.error('❌ Notifications: Failed to fetch notifications:', error);
      if (mountedRef.current) {
        setError(error as Error);
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Fetch friend requests from backend
  const fetchFriendRequests = useCallback(async (showLoading = true) => {
    if (!userId || !mountedRef.current) return;

    try {
      if (showLoading) setLoading(true);
      
      const response = await api.get('/api/push-fetch/friend-requests');
      
      if (mountedRef.current && response.data.success) {
        setFriendRequests(response.data.data);
        console.log('👥 Friend Requests: Fetched', response.data.count, 'requests');
        setError(null);
      }
    } catch (error) {
      console.error('❌ Friend Requests: Failed to fetch friend requests:', error);
      if (mountedRef.current) {
        setError(error as Error);
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Fetch all data
  const fetchAllData = useCallback(async (showLoading = true) => {
    if (!userId || !mountedRef.current) return;

    try {
      if (showLoading) setLoading(true);
      
      // Fetch both notifications and friend requests in parallel
      await Promise.all([
        fetchNotifications(false),
        fetchFriendRequests(false)
      ]);
      
    } catch (error) {
      console.error('❌ Data: Failed to fetch all data:', error);
      if (mountedRef.current) {
        setError(error as Error);
      }
    } finally {
      if (mountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [userId, fetchNotifications, fetchFriendRequests]);

  // Refresh data with pull-to-refresh
  const refreshData = useCallback(async () => {
    if (!userId || refreshing) return;

    setRefreshing(true);
    try {
      await fetchAllData(false);
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [userId, refreshing, fetchAllData]);

  // Mark notification as read (this should update your main notification system)
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      // Call your existing notification API to mark as read
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, is_seen: true, status: 'read' }
            : notif
        )
      );
      
      console.log('✅ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  }, []);

  // Initialize data fetching
  useEffect(() => {
    mountedRef.current = true;
    
    if (userId) {
      fetchAllData(true);
      
      // Set up periodic refresh (every 2 minutes)
      const intervalId = setInterval(() => {
        fetchAllData(false);
      }, 2 * 60 * 1000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [userId, fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Handle push notification received (trigger immediate fetch)
  const handlePushNotificationReceived = useCallback((notificationData: any) => {
    console.log('📱 Push notification received, triggering data fetch for type:', notificationData?.type);
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Debounce rapid notifications
    refreshTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        const type = notificationData?.type;
        
        // Fetch specific data based on notification type for better performance
        if (type === 'friend_request' || type === 'friend_request_accepted') {
          console.log('🔄 Fetching friend requests specifically');
          fetchFriendRequests(false);
        } else if (type && type.includes('event')) {
          console.log('🔄 Fetching notifications specifically');
          fetchNotifications(false);
        } else {
          // Fallback to refresh all data
          console.log('🔄 Fetching all notification data');
          refreshData();
        }
      }
    }, 500);
  }, [refreshData, fetchFriendRequests, fetchNotifications]);

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.is_seen).length;
  const pendingFriendRequestCount = friendRequests.filter(r => r.status === 'pending').length;

  return {
    notifications,
    friendRequests,
    loading,
    error,
    refreshing,
    unreadCount,
    pendingFriendRequestCount,
    fetchAllData,
    refreshData,
    markNotificationAsRead,
    handlePushNotificationReceived
  };
}