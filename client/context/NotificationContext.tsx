import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useManageFriends } from '@/hooks/useManageFriends';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';

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
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [friendRequests, setFriendRequests] = useState<FriendRequestNotification[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(new Set());
  const [unseenNotificationCount, setUnseenNotificationCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    getReceivedFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();

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
        console.log('Fetched notifications from API:', response.data.notifications);
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
    console.log('Marking notification as viewed:', notificationId);
    // Mark notification as read (seen) but keep it in the list
    setNotifications(prev => 
      prev.map(notification => 
        notification._id === notificationId 
          ? { ...notification, is_seen: true }
          : notification
      )
    );

    // Also mark as seen in the backend - this will trigger the change stream
    try {
      await api.put('/api/notifications/mark-seen', {
        notificationIds: [notificationId]
      });
      console.log('Successfully marked notification as seen in backend:', notificationId);
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  }, []);

  const markAllNotificationsAsViewed = useCallback(async () => {
    try {
      // Mark all notifications as seen in the backend
      await api.put('/api/notifications/mark-seen', {});

      // Update local state to mark all as seen
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_seen: true }))
      );
      
      // Mark all friend requests as viewed locally
      setViewedNotifications(prev => {
        const currentFriendRequestIds = friendRequests.map(r => r._id);
        return new Set([...prev, ...currentFriendRequestIds]);
      });
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  }, [friendRequests]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchFriendRequests(), fetchNotifications()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchFriendRequests, fetchNotifications]);

  // WebSocket for real-time updates
  useEffect(() => {
    let socket: WebSocket;
    let isConnected = false;

    const initSocket = async () => {
      const url = process.env.EXPO_PUBLIC_WEBSOCKET_CONNECTION_URL;
      if (!url) return;
      
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      // Prevent multiple connections
      if (isConnected) return;

      socket = new WebSocket(url);

      socket.onopen = () => {
        isConnected = true;
        console.log('WebSocket connected for notifications (global context)');
        socket.send(JSON.stringify({
          type: 'NotificationsListener',
          userId: userId,
        }));
        console.log(`Registered NotificationsListener for user ${userId}`);
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message (global):', message);

        switch (message.type) {
          case 'newFriendRequest':
            console.log('Processing newFriendRequest:', message.data);
            setFriendRequests(prev => [message.data, ...prev]);
            break;
          case 'friendRequestAccepted':
            console.log('Processing friendRequestAccepted:', message.requestId);
            setFriendRequests(prev => {
              const filtered = prev.filter(req => req._id !== message.requestId);
              // Clean up viewed notifications for this request
              setViewedNotifications(prevViewed => {
                const newViewed = new Set(prevViewed);
                newViewed.delete(message.requestId);
                return newViewed;
              });
              return filtered;
            });
            break;
          case 'friendRequestRejected':
            console.log('Processing friendRequestRejected:', message.requestId);
            setFriendRequests(prev => {
              const filtered = prev.filter(req => req._id !== message.requestId);
              // Clean up viewed notifications for this request
              setViewedNotifications(prevViewed => {
                const newViewed = new Set(prevViewed);
                newViewed.delete(message.requestId);
                return newViewed;
              });
              return filtered;
            });
            break;
          case 'friendRequestCancelled':
            // Remove the cancelled friend request from the list
            console.log('Processing friendRequestCancelled:', message.requestId);
            console.log('Current friend requests before cancellation:', friendRequests.map(r => ({ id: r._id, sender: r.sender?.full_name })));
            
            setFriendRequests(prev => {
              const beforeCount = prev.length;
              const filtered = prev.filter(req => {
                const matches = req._id === message.requestId;
                console.log(`Comparing friend request ${req._id} with cancelled ${message.requestId}: ${matches ? 'MATCH' : 'NO MATCH'}`);
                return !matches;
              });
              const afterCount = filtered.length;
              console.log(`Friend requests count: ${beforeCount} -> ${afterCount}`);
              console.log('Remaining friend requests:', filtered.map(r => ({ id: r._id, sender: r.sender?.full_name })));
              
              // Clean up viewed notifications for this request
              setViewedNotifications(prevViewed => {
                const newViewed = new Set(prevViewed);
                newViewed.delete(message.requestId);
                return newViewed;
              });
              return filtered;
            });

            // Also remove related notifications from the notifications array
            console.log('Current notifications before filtering:', notifications.map(n => ({ 
              id: n._id, 
              type: n.type, 
              friendRequestId: n.friend_request?._id,
              title: n.title 
            })));
            
            setNotifications(prev => {
              const beforeCount = prev.length;
              const filtered = prev.filter(notification => {
                // Remove notifications that are related to this friend request
                // Check multiple possible ways the friend request ID might be stored
                const friendRequestId = notification.friend_request?._id || notification.friend_request;
                const isRelatedToFriendRequest = notification.type === 'friend_request' && 
                  (friendRequestId === message.requestId || notification._id === message.requestId);
                
                if (isRelatedToFriendRequest) {
                  console.log(`Removing notification ${notification._id} for cancelled friend request ${message.requestId}`);
                  console.log('Notification details:', {
                    notificationId: notification._id,
                    type: notification.type,
                    friendRequestId: friendRequestId,
                    cancelledRequestId: message.requestId
                  });
                  return false;
                }
                return true;
              });
              const afterCount = filtered.length;
              console.log(`Notifications count: ${beforeCount} -> ${afterCount} (removed friend request notifications)`);
              console.log('Remaining notifications:', filtered.map(n => ({ 
                id: n._id, 
                type: n.type, 
                friendRequestId: n.friend_request?._id || n.friend_request,
                title: n.title 
              })));
              return filtered;
            });

            console.log('Friend request cancelled by sender:', message.requestId);
            break;
          case 'newNotification':
            console.log('Received new notification via WebSocket (global):', message.data);
            setNotifications(prev => [message.data, ...prev]);
            // Update unseen count from server
            if (typeof message.unseenCount === 'number') {
              setUnseenNotificationCount(message.unseenCount);
            }
            break;
          case 'notificationCountUpdate':
            console.log('Received notification count update (global):', message.unseenCount);
            // Update unseen count when notifications are marked as seen
            if (typeof message.unseenCount === 'number') {
              setUnseenNotificationCount(message.unseenCount);
            }
            break;
          default:
            console.log('Unknown WebSocket message type:', message.type);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error (global):', error);
        isConnected = false;
      };

      socket.onclose = () => {
        console.log('WebSocket closed for notifications (global)');
        isConnected = false;
      };
    };

    initSocket();

    return () => {
      isConnected = false;
      if (socket) {
        console.log('Cleaning up WebSocket connection (global)');
        socket.close();
      }
    };
  }, []);

  // Initial data fetch - run only once on mount
  useEffect(() => {
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
  }, [fetchFriendRequests, fetchNotifications]);

  // Calculate unseen notifications count (use server-provided count when available)
  const unseenNotificationsCount = useMemo(() => {
    // Use server-provided count if available, otherwise fall back to local calculation
    if (unseenNotificationCount > 0) {
      return unseenNotificationCount;
    }
    return notifications.filter(notification => !notification.is_seen).length;
  }, [notifications, unseenNotificationCount]);

  // Total unseen count includes unseen friend requests + unseen notifications
  const totalUnseenCount = useMemo(() => {
    const friendRequestCount = friendRequests.filter(request => !viewedNotifications.has(request._id)).length;
    const notificationCount = unseenNotificationsCount;
    console.log(`Total unseen count calculation (global): ${friendRequestCount} friend requests + ${notificationCount} notifications = ${friendRequestCount + notificationCount}`);
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
    refreshData
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