import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useManageFriends } from '@/hooks/useManageFriends';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';
import { useNotifications as useFirebaseNotificationsHook, useFriendRequests as useFirebaseFriendRequestsHook, useFirebaseUpdate } from '@/hooks/useFirebaseRealtime';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { firebaseAuth, db } from '@/config/firebase';
import { ref, onValue, update, get, remove } from '@react-native-firebase/database';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useBadgeManager } from '@/hooks/useBadgeManager';

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
  // Firebase is now the primary source
  firebaseLoading: boolean;
  markFirebaseNotificationAsRead: (notificationId: string) => Promise<boolean>;
  getFormattedNotificationContent: (notification: NotificationData) => { title: string, subtitle?: string };
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isFirebaseAuthenticated, accessToken } = useAuthSession();
  const [backendFriendRequests, setBackendFriendRequests] = useState<FriendRequestNotification[]>([]);
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(new Set());
  const [viewedFriendRequests, setViewedFriendRequests] = useState<Set<string>>(new Set());
  const [unseenNotificationCount, setUnseenNotificationCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendNotifications, setBackendNotifications] = useState<NotificationData[]>([]);
  const [usingBackendFallback, setUsingBackendFallback] = useState(false);
  const [usingFriendRequestBackendFallback, setUsingFriendRequestBackendFallback] = useState(false);
  
  // Refs to prevent multiple concurrent cleanup operations
  const markingAllNotificationsRef = useRef(false);
  const markingFriendRequestsRef = useRef(false);
  
  // Stable function refs to avoid dependency issues
  const markAllNotificationsAsViewedRef = useRef<() => Promise<void>>(async () => {});
  const markFriendRequestsAsViewedRef = useRef<() => Promise<void>>(async () => {});
  
  // Get Firebase notifications as the primary source
  const {
    notifications: firebaseNotifications,
    loading: firebaseLoading,
    error: firebaseError,
    markAsRead
  } = useFirebaseNotificationsHook();

  // Get Firebase friend requests as the primary source
  const {
    data: firebaseFriendRequests,
    loading: firebaseFriendRequestsLoading,
    error: firebaseFriendRequestsError
  } = useFirebaseFriendRequestsHook();
  
  const {
    getReceivedFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();

  // Badge manager for app icon badge
  const { updateBadgeCount, clearBadge } = useBadgeManager();

  // Backend notification fetching as fallback only
  const fetchNotificationsFromBackend = useCallback(async () => {
    try {
      const response = await api.get('/api/notifications');
      const fetchedNotifications = response.data.notifications || [];
      setBackendNotifications(fetchedNotifications);
    } catch (error) {
      // Silent failure for fallback
    }
  }, []);

  // Check if Firebase has failed after 3 retries and switch to backend fallback
  useEffect(() => {
    if (firebaseError && !firebaseLoading && !usingBackendFallback) {
      setUsingBackendFallback(true);
      fetchNotificationsFromBackend();
    }
  }, [firebaseError, firebaseLoading, usingBackendFallback, fetchNotificationsFromBackend]);

  // Check if Firebase has recovered when using backend fallback
  useEffect(() => {
    if (usingBackendFallback && !firebaseError && !firebaseLoading && firebaseNotifications) {
      setUsingBackendFallback(false);
      setBackendNotifications([]);
    }
  }, [usingBackendFallback, firebaseError, firebaseLoading, firebaseNotifications]);

  // Combine backend notifications with real-time Firebase updates
  const notifications = useMemo(() => {
    if (usingBackendFallback) {
      return backendNotifications;
    }
    
    // Start with backend notifications as the base
    let allNotifications = [...backendNotifications];
    
    // Process Firebase notifications (these should only be new/unseen ones)
    if (firebaseNotifications) {
      try {
        const firebaseNotificationsList = Object.values(firebaseNotifications)
          .filter(item => item && typeof item === 'object')
          .map(fbNotification => ({
            _id: fbNotification._id?.toString() || '',
            type: fbNotification.type || 'new_event_from_friend',
            title: fbNotification.title || '',
            subtitle: fbNotification.subtitle,
            message_body: fbNotification.message_body,
            status: fbNotification.status || 'unseen',
            is_seen: fbNotification.is_seen || false,
            created_at: fbNotification.timestamp ? new Date(fbNotification.timestamp).toISOString() : new Date().toISOString(),
            updated_at: fbNotification.updated_at || new Date().toISOString(),
            recipient: fbNotification.recipient,
            sender: fbNotification.sender,
            event: fbNotification.event,
            friend_request: fbNotification.friend_request,
            data: fbNotification.data,
            count: fbNotification.count,
            location: fbNotification.location
          }));

        // Add Firebase notifications that don't already exist in backend notifications
        const existingIds = new Set(backendNotifications.map(n => n._id));
        const newFirebaseNotifications = firebaseNotificationsList.filter(fn => !existingIds.has(fn._id));
        
        // Merge and sort all notifications
        allNotifications = [...backendNotifications, ...newFirebaseNotifications];
      } catch (error) {
        console.error('Error processing Firebase notifications:', error);
      }
    }
    
    // Sort by creation time (newest first)
    return allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [firebaseNotifications, backendNotifications, usingBackendFallback]);

  // Update unseen count whenever notifications change
  useEffect(() => {
    const unseenCount = notifications.filter(n => !n.is_seen).length;
    setUnseenNotificationCount(unseenCount);
  }, [notifications]);

  // Fetch friend requests from backend (source of truth)
  const fetchFriendRequestsFromBackend = useCallback(async () => {
    try {
      const response = await getReceivedFriendRequests();
      const requests = response.data.requests;
      setBackendFriendRequests(requests);
      
      // If Firebase has an error, use backend as fallback
      if (firebaseFriendRequestsError) {
        setUsingFriendRequestBackendFallback(true);
      }
    } catch (error) {
      console.error('Error fetching friend requests from backend:', error);
      setBackendFriendRequests([]);
    }
  }, [getReceivedFriendRequests, firebaseFriendRequestsError]);

  // Check if Firebase friend requests has failed and switch to backend fallback
  useEffect(() => {
    if (firebaseFriendRequestsError && !firebaseFriendRequestsLoading && !usingFriendRequestBackendFallback) {
      setUsingFriendRequestBackendFallback(true);
      fetchFriendRequestsFromBackend();
    }
  }, [firebaseFriendRequestsError, firebaseFriendRequestsLoading, usingFriendRequestBackendFallback, fetchFriendRequestsFromBackend]);

  // Check if Firebase has recovered when using backend fallback
  useEffect(() => {
    if (usingFriendRequestBackendFallback && !firebaseFriendRequestsError && !firebaseFriendRequestsLoading && firebaseFriendRequests) {
      setUsingFriendRequestBackendFallback(false);
      setBackendFriendRequests([]);
    }
  }, [usingFriendRequestBackendFallback, firebaseFriendRequestsError, firebaseFriendRequestsLoading, firebaseFriendRequests]);

  // Combine backend friend requests with real-time Firebase updates
  const friendRequests = useMemo(() => {
    if (usingFriendRequestBackendFallback) {
      return backendFriendRequests;
    }
    
    // Start with backend friend requests as the base
    let allFriendRequests = [...backendFriendRequests];
    
    // Process Firebase friend requests (these should only be new/unseen ones)
    if (firebaseFriendRequests) {
      try {
        const firebaseFriendRequestsList = Object.values(firebaseFriendRequests)
          .filter(item => item && typeof item === 'object')
          .map((fbRequest: any) => ({
            _id: fbRequest._id?.toString() || '',
            sender: {
              _id: fbRequest.from?.toString() || '',
              first_name: fbRequest.sender?.first_name || '',
              last_name: fbRequest.sender?.last_name || '',
              full_name: fbRequest.sender?.full_name || '',
              username: fbRequest.sender?.username || '',
              profile_picture: fbRequest.sender?.profile_picture || ''
            },
            mutualFriendsCount: fbRequest.mutualFriendsCount || 0,
            created_at: fbRequest.created_at || new Date().toISOString(),
            status: fbRequest.status || 'pending'
          }));

        // Add Firebase friend requests that don't already exist in backend friend requests
        const existingIds = new Set(backendFriendRequests.map(r => r._id));
        const newFirebaseFriendRequests = firebaseFriendRequestsList.filter(fr => !existingIds.has(fr._id));
        
        // Merge all friend requests
        allFriendRequests = [...backendFriendRequests, ...newFirebaseFriendRequests];
      } catch (error) {
        console.error('Error processing Firebase friend requests:', error);
      }
    }
    
    // Sort by creation time (newest first)
    return allFriendRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [firebaseFriendRequests, backendFriendRequests, usingFriendRequestBackendFallback]);

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
      
      // Update backend friend requests state
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
      
      // Update backend friend requests state
      setBackendFriendRequests((prev: FriendRequestNotification[]) => 
        prev.filter((req: FriendRequestNotification) => req.sender._id !== senderId)
      );
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  }, [rejectFriendRequest, friendRequests]);

  const markNotificationAsViewed = useCallback(async (notificationId: string) => {
    try {
      // Always update both backend state and Firebase
      const updatePromises = [];
      
      // Update backend
      updatePromises.push(
        api.put('/api/notifications/mark-seen', {
          notificationIds: [notificationId]
        })
      );

      // Update Firebase if available
      if (markAsRead) {
        updatePromises.push(markAsRead(notificationId));
      }

      await Promise.all(updatePromises);
      
      // Update local backend notifications state
      setBackendNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, is_seen: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  }, [markAsRead]);

  const markAllNotificationsAsViewed = useCallback(async () => {
    // Prevent multiple concurrent executions
    if (markingAllNotificationsRef.current) {
      return;
    }
    
    markingAllNotificationsRef.current = true;
    
    try {
      // Always update both backend and Firebase first
      await api.put('/api/notifications/mark-seen', {});
      
      // Get current state at execution time to avoid stale closure issues
      const currentNotifications = notifications.filter(notification => !notification.is_seen);
      const currentFriendRequests = friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id));
      
      // Only proceed if there are items to mark as viewed
      if (currentNotifications.length === 0 && currentFriendRequests.length === 0) {
        return;
      }
      
      const unseenNotificationIds = currentNotifications.map(notification => notification._id);
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
      
      // Update Firebase for all unseen notifications
      if (markAsRead && unseenNotificationIds.length > 0) {
        const firebaseUpdates = unseenNotificationIds.map(id => markAsRead(id));
        await Promise.all(firebaseUpdates);
      }
      
      // Update local backend notifications state
      setBackendNotifications(prev => 
        prev.map(n => ({ ...n, is_seen: true }))
      );

      // Clear the app badge since all notifications are now viewed
      await clearBadge();
    } catch (error) {
      console.error('Error marking all notifications as viewed:', error);
    } finally {
      markingAllNotificationsRef.current = false;
    }
  }, [markAsRead, notifications, friendRequests, viewedFriendRequests, clearBadge]);

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

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Always refresh both friend requests and backend notifications
      // Firebase provides real-time updates, backend provides the complete history
      await Promise.all([
        fetchFriendRequestsFromBackend(),
        fetchNotificationsFromBackend()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFriendRequestsFromBackend, fetchNotificationsFromBackend]);

  // Initial data fetch - load all notifications from backend, Firebase only for real-time updates
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch both friend requests and all existing notifications from backend
        await Promise.all([
          fetchFriendRequestsFromBackend(),
          fetchNotificationsFromBackend()
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchFriendRequestsFromBackend, fetchNotificationsFromBackend, userId]);

  // Calculate unseen notifications count
  const unseenNotificationsCount = useMemo(() => {
    return notifications.filter(notification => !notification.is_seen).length;
  }, [notifications]);

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
    notifications,
    viewedNotifications,
    unseenNotificationCount: totalUnseenCount,
    loading: loading || firebaseLoading,
    refreshing,
    totalNotificationCount: notifications.length + friendRequests.length,
    unseenNotificationsCount,
    unseenFriendRequestsCount: friendRequests.filter((request: FriendRequestNotification) => !viewedFriendRequests.has(request._id)).length,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markNotificationAsViewed,
    markAllNotificationsAsViewed,
    markFriendRequestsAsViewed,
    refreshData,
    firebaseLoading,
    markFirebaseNotificationAsRead: markAsRead || (async () => false),
    getFormattedNotificationContent,
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