import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useManageFriends } from '@/hooks/useManageFriends';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';
import { useNotifications as useFirebaseNotificationsHook, useFirebaseUpdate } from '@/hooks/useFirebaseRealtime';
import { useAuthSession } from '@/components/Auth/AuthProvider';

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
  refreshData: () => Promise<void>;
  // Firebase-related additions
  mergedNotifications: NotificationData[];
  firebaseLoading: boolean;
  markFirebaseNotificationAsRead: (notificationId: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId } = useAuthSession();
  const [friendRequests, setFriendRequests] = useState<FriendRequestNotification[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(new Set());
  const [unseenNotificationCount, setUnseenNotificationCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mergedNotifications, setMergedNotifications] = useState<NotificationData[]>([]);
  
  // Get Firebase notifications
  const { notifications: firebaseNotifications, loading: firebaseLoading, markAsRead } = useFirebaseNotificationsHook();
  
  const {
    getReceivedFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();

  // Helper function to merge notifications from context and Firebase
  const mergeNotificationsFromSources = useCallback((contextNotifications: NotificationData[], firebaseArray: any[]) => {
    // Create a map of existing notifications by ID
    const notificationMap = new Map<string, NotificationData>();
    
    // Clean up and validate context notifications before adding to map
    contextNotifications.forEach(notification => {
      if (notification && notification._id) {
        notificationMap.set(notification._id, notification);
      }
    });
    
    // Add or update with Firebase notifications (they're more up-to-date)
    firebaseArray.forEach(fbNotification => {
      if (fbNotification && fbNotification._id) {
        // Convert Firebase notification to match our NotificationData type
        const notification = {
          _id: fbNotification._id.toString(), // Ensure ID is a string
          type: fbNotification.type || 'event_created',
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
        };
        
        notificationMap.set(notification._id, notification);
      }
    });
    
    // Convert the map back to an array and sort by timestamp (newest first)
    return Array.from(notificationMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

  // Merge Firebase notifications whenever they change
  useEffect(() => {
    if (firebaseNotifications) {
      try {
        // Convert Firebase object to array and filter out invalid entries
        const firebaseArray = Object.values(firebaseNotifications || {})
          .filter(item => item && typeof item === 'object');
        
        if (firebaseArray.length > 0) {
          // Merge with existing notifications
          const merged = mergeNotificationsFromSources(notifications, firebaseArray);
          
          // Check for and log any potential duplicate IDs
          const idCount = new Map<string, number>();
          merged.forEach(item => {
            const count = idCount.get(item._id) || 0;
            idCount.set(item._id, count + 1);
          });
          
          const duplicates = Array.from(idCount.entries())
            .filter(([_, count]) => count > 1)
            .map(([id]) => id);
          
          if (duplicates.length > 0) {
            console.warn('Duplicate notification IDs found:', duplicates);
          }
          
          // Update state with merged notifications
          setMergedNotifications(merged);
          
          // Update unseen count
          const unseenCount = merged.filter(n => !n.is_seen).length;
          setUnseenNotificationCount(unseenCount);
        }
      } catch (error) {
        console.error('Error merging notifications:', error);
        // Fallback to using just the API notifications
        setMergedNotifications(notifications);
      }
    } else {
      // If no Firebase notifications, just use the REST API notifications
      setMergedNotifications(notifications);
    }
  }, [firebaseNotifications, notifications, mergeNotificationsFromSources]);

  const fetchFriendRequests = useCallback(async () => {
    try {
      const response = await getReceivedFriendRequests();
      const requests = response.data.requests;
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  }, [getReceivedFriendRequests]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/api/notifications');

      if (response.status === 200) {
        setNotifications(response.data.notifications || []);
        // Set initial unseen count from server
        if (typeof response.data.unseenCount === 'number') {
          setUnseenNotificationCount(response.data.unseenCount);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const handleAcceptFriendRequest = useCallback(async (senderId: string) => {
    try {
      await acceptFriendRequest(senderId);
      setFriendRequests(prev => {
        const requestToRemove = prev.find(req => req.sender._id === senderId);
        if (requestToRemove) {
          // Clean up viewed notifications for this request
          setViewedNotifications(prevViewed => {
            const newViewed = new Set(prevViewed);
            newViewed.delete(requestToRemove._id);
            return newViewed;
          });
        }
        return prev.filter(req => req.sender._id !== senderId);
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  }, [acceptFriendRequest]);

  const handleDeclineFriendRequest = useCallback(async (senderId: string) => {
    try {
      await rejectFriendRequest(senderId);
      setFriendRequests(prev => {
        const requestToRemove = prev.find(req => req.sender._id === senderId);
        if (requestToRemove) {
          // Clean up viewed notifications for this request
          setViewedNotifications(prevViewed => {
            const newViewed = new Set(prevViewed);
            newViewed.delete(requestToRemove._id);
            return newViewed;
          });
        }
        return prev.filter(req => req.sender._id !== senderId);
      });
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  }, [rejectFriendRequest]);

  const markNotificationAsViewed = useCallback(async (notificationId: string) => {
    // Mark notification as read (seen) but keep it in the list
    setNotifications(prev => 
      prev.map(notification => 
        notification._id === notificationId 
          ? { ...notification, is_seen: true }
          : notification
      )
    );
    
    // Also update merged notifications
    setMergedNotifications(prev => 
      prev.map(notification => 
        notification._id === notificationId 
          ? { ...notification, is_seen: true }
          : notification
      )
    );

    try {
      // Update both Firebase and backend in parallel
      const updatePromises = [];
      
      // Update the backend
      updatePromises.push(
        api.put('/api/notifications/mark-seen', {
          notificationIds: [notificationId]
        })
      );

      // Update Firebase if available
      if (markAsRead) {
        updatePromises.push(markAsRead(notificationId));
      }

      // Wait for both updates to complete
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  }, [markAsRead]);

  const markAllNotificationsAsViewed = useCallback(async () => {
    // Get all notification IDs that are not yet seen
    const unseenNotificationIds = notifications
      .filter(notification => !notification.is_seen)
      .map(notification => notification._id);
    
    // If no unseen notifications, nothing to do
    if (unseenNotificationIds.length === 0) return;
    
    // Update local state first
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_seen: true }))
    );
    
    // Update merged notifications as well
    setMergedNotifications(prev => 
      prev.map(notification => ({ ...notification, is_seen: true }))
    );
    
    // Mark all friend requests as viewed locally
    setViewedNotifications(prev => {
      const currentFriendRequestIds = friendRequests.map(r => r._id);
      return new Set([...prev, ...currentFriendRequestIds]);
    });
    
    // Update unseen count
    setUnseenNotificationCount(0);
    
    try {
      // Update backend
      await api.put('/api/notifications/mark-seen', {});
      
      // Update Firebase for each notification
      if (markAsRead && unseenNotificationIds.length > 0) {
        // Update each notification in Firebase
        const firebaseUpdates = unseenNotificationIds.map(id => markAsRead(id));
        await Promise.all(firebaseUpdates);
      }
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
    }
  }, [friendRequests, notifications, markAsRead]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchFriendRequests(), fetchNotifications()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFriendRequests, fetchNotifications]);

  // Initial data fetch - only when user is logged in
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchFriendRequests();
        await fetchNotifications();
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchFriendRequests, fetchNotifications, userId]);

  // Calculate unseen notifications count (use server-provided count when available)
  const unseenNotificationsCount = useMemo(() => {
    // Use server-provided count if available, otherwise fall back to local calculation
    if (unseenNotificationCount > 0) {
      return unseenNotificationCount;
    }
    return mergedNotifications.filter(notification => !notification.is_seen).length;
  }, [mergedNotifications, unseenNotificationCount]);

  // Total unseen count includes unseen friend requests + unseen notifications
  const totalUnseenCount = useMemo(() => {
    const friendRequestCount = friendRequests.filter(request => !viewedNotifications.has(request._id)).length;
    const notificationCount = unseenNotificationsCount;

    return friendRequestCount + notificationCount;
  }, [friendRequests, viewedNotifications, unseenNotificationsCount]);

  const value: NotificationContextType = {
    friendRequests,
    notifications,
    viewedNotifications,
    unseenNotificationCount,
    loading,
    refreshing,
    totalNotificationCount: totalUnseenCount,
    unseenNotificationsCount,
    unseenFriendRequestsCount: friendRequests.filter(request => !viewedNotifications.has(request._id)).length,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markNotificationAsViewed,
    markAllNotificationsAsViewed,
    refreshData,
    // Firebase-related additions
    mergedNotifications,
    firebaseLoading,
    markFirebaseNotificationAsRead: markAsRead || (async () => false)
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