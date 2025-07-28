import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useManageFriends } from '@/hooks/useManageFriends';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';
// Using APNs push-to-fetch system
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useBadgeManager } from '@/hooks/useBadgeManager';
import { setupBackgroundNotificationHandler } from '@/utils/backgroundNotificationHandler';

// Create notification context
interface NotificationContextType {
  friendRequests: FriendRequestNotification[];
  notifications: NotificationData[];
  viewedNotifications: Set<string>;
  unseenNotificationCount: number;
  loading: boolean;
  refreshing: boolean;
  totalNotificationCount: number;
  unseenNotificationsCount: number;
  unseenFriendRequestsCount: number;
  handleAcceptFriendRequest: (senderId: string) => Promise<void>;
  handleDeclineFriendRequest: (senderId: string) => Promise<void>;
  markNotificationAsViewed: (notificationId: string) => Promise<void>;
  markAllNotificationsAsViewed: () => Promise<void>;
  markFriendRequestsAsViewed: () => Promise<void>;
  refreshData: () => Promise<void>;
  // Push-to-fetch system loading state
  pushFetchLoading: boolean;
  getFormattedNotificationContent: (notification: NotificationData) => { title: string, subtitle?: string };
  // Register callback for notifications page to refresh when background notifications arrive
  registerNotificationPageCallback: (callback: (type: string) => void) => () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, accessToken } = useAuthSession();
  const [backendFriendRequests, setBackendFriendRequests] = useState<FriendRequestNotification[]>([]);
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(new Set());
  const [viewedFriendRequests, setViewedFriendRequests] = useState<Set<string>>(new Set());
  const [unseenNotificationCount, setUnseenNotificationCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [friendRequestsLoading, setFriendRequestsLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  
  // Refs to prevent multiple concurrent cleanup operations
  const markingAllNotificationsRef = useRef(false);
  const markingFriendRequestsRef = useRef(false);
  
  // Stable function refs to avoid dependency issues
  const markAllNotificationsAsViewedRef = useRef<() => Promise<void>>(async () => {});
  const markFriendRequestsAsViewedRef = useRef<() => Promise<void>>(async () => {});
  
  // Callback system for notifications page to get notified of background updates
  const notificationPageCallbackRef = useRef<((type: string) => void) | null>(null);
  
  // Use push-to-fetch notification system - we don't need to destructure anything from this hook
  // as we're managing notifications independently in this context
  
  const {
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();

  // Badge manager for app icon badge
  const { updateBadgeCount, clearBadge } = useBadgeManager();

  // Fetch notifications from backend using push-to-fetch endpoint
  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const response = await api.get('/api/push-fetch/notifications');
      const fetchedNotifications = response.data.success ? response.data.data : [];
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  // Sort notifications by creation time (newest first)
  const sortedNotifications = useMemo(() => {
    return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notifications]);

  // Update unseen count whenever notifications change
  useEffect(() => {
    const unseenCount = sortedNotifications.filter(n => !n.is_seen).length;
    setUnseenNotificationCount(unseenCount);
  }, [sortedNotifications]);

  // Fetch friend requests from backend using push-to-fetch endpoint
  const fetchFriendRequestsFromBackend = useCallback(async () => {
    setFriendRequestsLoading(true);
    try {
      const response = await api.get('/api/push-fetch/friend-requests');
      const requests = response.data.success ? response.data.data : [];
      setBackendFriendRequests(requests);
    } catch (error) {
      console.error('Error fetching friend requests from backend:', error);
      setBackendFriendRequests([]);
    } finally {
      setFriendRequestsLoading(false);
    }
  }, []);

  // Sort friend requests by creation time (newest first)
  const friendRequests = useMemo(() => {
    return backendFriendRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [backendFriendRequests]);

  const handleAcceptFriendRequest = useCallback(async (senderId: string) => {
    try {
      await acceptFriendRequest(senderId);
      
      // Find the request to clean up
      const requestToRemove = friendRequests.find((req: FriendRequestNotification) => req.sender._id === senderId);
      if (requestToRemove) {
        // Clean up viewed notifications for this request
        setViewedNotifications(prevViewed => {
          const newViewed = new Set(prevViewed);
          newViewed.delete(requestToRemove._id);
          return newViewed;
        });
      }
      
      // Update friend requests state
      setBackendFriendRequests((prev: FriendRequestNotification[]) => 
        prev.filter((req: FriendRequestNotification) => req.sender._id !== senderId)
      );
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  }, [acceptFriendRequest, friendRequests]);

  const handleDeclineFriendRequest = useCallback(async (senderId: string) => {
    try {
      await rejectFriendRequest(senderId);
      
      // Find the request to clean up
      const requestToRemove = friendRequests.find((req: FriendRequestNotification) => req.sender._id === senderId);
      if (requestToRemove) {
        // Clean up viewed notifications for this request
        setViewedNotifications(prevViewed => {
          const newViewed = new Set(prevViewed);
          newViewed.delete(requestToRemove._id);
          return newViewed;
        });
      }
      
      // Update friend requests state
      setBackendFriendRequests((prev: FriendRequestNotification[]) => 
        prev.filter((req: FriendRequestNotification) => req.sender._id !== senderId)
      );
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  }, [rejectFriendRequest, friendRequests]);

  const markNotificationAsViewed = useCallback(async (notificationId: string) => {
    try {
      // Use API approach - handles MongoDB update
      await api.put('/api/notifications/mark-seen', {
        notificationIds: [notificationId]
      });
      
      // Update local notifications state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, is_seen: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  }, []);

  const markAllNotificationsAsViewed = useCallback(async () => {
    // Prevent multiple concurrent executions
    if (markingAllNotificationsRef.current) {
      return;
    }
    
    markingAllNotificationsRef.current = true;
    
    try {
      // Use API approach - handles MongoDB update
      await api.put('/api/notifications/mark-seen', {});
      
      // Get current state at execution time to avoid stale closure issues
      const currentNotifications = sortedNotifications.filter(notification => !notification.is_seen);
      const currentFriendRequests = friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id));
      
      // Only proceed if there are items to mark as viewed
      if (currentNotifications.length === 0 && currentFriendRequests.length === 0) {
        return;
      }
      
      const unseenFriendRequestIds = currentFriendRequests.map((request: FriendRequestNotification) => request._id);
      
      // Mark all friend requests as viewed locally
      if (unseenFriendRequestIds.length > 0) {
        setViewedFriendRequests(prev => {
          const newViewed = new Set(prev);
          unseenFriendRequestIds.forEach(id => newViewed.add(id));
          return newViewed;
        });
      }
      
      // Mark all notifications as viewed locally (legacy support)
      if (friendRequests.length > 0) {
        setViewedNotifications(prev => {
          const currentFriendRequestIds = friendRequests.map((r: FriendRequestNotification) => r._id);
          return new Set([...prev, ...currentFriendRequestIds]);
        });
      }
      
      // Update unseen count
      setUnseenNotificationCount(0);
      
      // Update local notifications state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_seen: true }))
      );

      // Clear the app badge since all notifications are now viewed
      await clearBadge();
    } catch (error) {
      console.error('Error marking all notifications as viewed:', error);
    } finally {
      markingAllNotificationsRef.current = false;
    }
  }, [sortedNotifications, friendRequests, viewedFriendRequests, clearBadge]);

  // Mark friend requests as viewed
  const markFriendRequestsAsViewed = useCallback(async () => {
    // Prevent multiple concurrent executions
    if (markingFriendRequestsRef.current) {
      return;
    }
    
    markingFriendRequestsRef.current = true;
    
    try {
      // Get current state at execution time to avoid stale closure issues
      const currentFriendRequests = friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id));
      
      if (currentFriendRequests.length === 0) return;
      
      const unseenFriendRequestIds = currentFriendRequests.map((request: FriendRequestNotification) => request._id);
      
      // Mark all friend requests as viewed locally
      setViewedFriendRequests(prev => {
        const newViewed = new Set(prev);
        unseenFriendRequestIds.forEach(id => newViewed.add(id));
        return newViewed;
      });
      
    } catch (error) {
      console.error('Error marking friend requests as viewed:', error);
    } finally {
      markingFriendRequestsRef.current = false;
    }
  }, [friendRequests, viewedFriendRequests]);

  // Update refs with current functions
  markAllNotificationsAsViewedRef.current = markAllNotificationsAsViewed;
  markFriendRequestsAsViewedRef.current = markFriendRequestsAsViewed;

  // Register callback function for notifications page
  const registerNotificationPageCallback = useCallback((callback: (type: string) => void) => {
    notificationPageCallbackRef.current = callback;
    
    // Return cleanup function
    return () => {
      notificationPageCallbackRef.current = null;
    };
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh both friend requests and notifications from backend
      await Promise.all([
        fetchFriendRequestsFromBackend(),
        fetchNotifications()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFriendRequestsFromBackend, fetchNotifications]);

  // Initial data fetch - load all data from backend
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch both friend requests and notifications from backend
        await Promise.all([
          fetchFriendRequestsFromBackend(),
          fetchNotifications()
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchFriendRequestsFromBackend, fetchNotifications, userId]);

  // Set up background notification handler for push-to-fetch
  useEffect(() => {
    if (!userId) return;

    const handleNotificationReceived = (type: string) => {
      
      // Refresh data based on notification type
      if (type === 'friend_request' || type === 'friend_request_accepted') {
        fetchFriendRequestsFromBackend();
      } else {
        fetchNotifications();
      }
      
      // Also notify the notifications page if it's currently active
      if (notificationPageCallbackRef.current) {
        notificationPageCallbackRef.current(type);
      }
    };

    const subscription = setupBackgroundNotificationHandler(handleNotificationReceived);
    
    return () => {
      subscription?.remove();
    };
  }, [userId, fetchFriendRequestsFromBackend, fetchNotifications]);

  // Calculate unseen notifications count
  const unseenNotificationsCount = useMemo(() => {
    return sortedNotifications.filter(notification => !notification.is_seen).length;
  }, [sortedNotifications]);

  // Total unseen count includes unseen friend requests + unseen notifications
  const totalUnseenCount = useMemo(() => {
    const friendRequestCount = friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id)).length;
    const notificationCount = unseenNotificationsCount;

    return friendRequestCount + notificationCount;
  }, [friendRequests, viewedFriendRequests, unseenNotificationsCount]);

  // Update app badge count whenever the total unseen count changes
  useEffect(() => {
    updateBadgeCount(totalUnseenCount);
  }, [totalUnseenCount, updateBadgeCount]);

  // Format notification content for display in banner or notification card
  const getFormattedNotificationContent = useCallback((notification: NotificationData) => {
    let title = "";
    let subtitle = "";

    if (!notification) return { title: "New notification" };

    // Default sender name
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

  const value: NotificationContextType = {
    friendRequests,
    notifications: sortedNotifications,
    viewedNotifications,
    unseenNotificationCount: totalUnseenCount,
    loading: loading || notificationsLoading || friendRequestsLoading,
    refreshing,
    totalNotificationCount: sortedNotifications.length + friendRequests.length,
    unseenNotificationsCount,
    unseenFriendRequestsCount: friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id)).length,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markNotificationAsViewed,
    markAllNotificationsAsViewed,
    markFriendRequestsAsViewed,
    refreshData,
    pushFetchLoading: notificationsLoading || friendRequestsLoading,
    getFormattedNotificationContent,
    registerNotificationPageCallback,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 