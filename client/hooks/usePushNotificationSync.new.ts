import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { setupBackgroundNotificationHandler } from '@/utils/backgroundNotificationHandler';
import { notificationQueryKeys } from './useNotificationSystem.new';
import { useAuthSession } from '@/components/Auth/AuthProvider';

// Background notification response configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Push notification integration hook
export const usePushNotificationSync = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  const notificationPageCallbackRef = useRef<((type: string) => void) | null>(null);

  // Handle incoming push notifications - sync data immediately
  const handleNotificationReceived = useCallback((notificationData: any) => {
    const type = notificationData?.type;
    
    console.log('🔔 Push notification received:', type);
    
    // Instantly invalidate relevant queries for real-time updates
    if (type === 'friend_request' || type === 'friend_request_accepted') {
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.friendRequests(),
        refetchType: 'active' // Only refetch if component is mounted
      });
    } else if (type && type.includes('event')) {
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.list(),
        refetchType: 'active'
      });
      
      // Also invalidate event-related queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } else {
      // Generic notification - refresh all notification data
      queryClient.invalidateQueries({ 
        queryKey: notificationQueryKeys.all,
        refetchType: 'active'
      });
    }
    
    // Notify notifications page if callback is registered
    if (notificationPageCallbackRef.current) {
      notificationPageCallbackRef.current(type);
    }
  }, [queryClient]);

  // Handle foreground notifications
  const handleForegroundNotification = useCallback((notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    handleNotificationReceived(data);
  }, [handleNotificationReceived]);

  // Handle notification interaction (tap)
  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    handleNotificationReceived(data);
    
    // Additional logic for navigation based on notification type
    const type = data?.type;
    if (type === 'friend_request') {
      // Could trigger navigation to friend requests
    } else if (type && typeof type === 'string' && type.includes('event')) {
      // Could trigger navigation to specific event
    }
  }, [handleNotificationReceived]);

  // Set up push notification listeners
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up push notification sync for user:', userId);

    // Foreground notification listener
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      handleForegroundNotification
    );

    // Notification interaction listener (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    // Background notification handler
    const backgroundSubscription = setupBackgroundNotificationHandler(handleNotificationReceived);

    // Cleanup function
    return () => {
      console.log('🔔 Cleaning up push notification sync');
      foregroundSubscription.remove();
      responseSubscription.remove();
      backgroundSubscription?.remove();
    };
  }, [userId, handleForegroundNotification, handleNotificationResponse, handleNotificationReceived]);

  // Register callback for notifications page to get real-time updates
  const registerNotificationPageCallback = useCallback((callback: (type: string) => void) => {
    console.log('🔔 Registering notifications page callback');
    notificationPageCallbackRef.current = callback;
    
    // Return cleanup function
    return () => {
      console.log('🔔 Unregistering notifications page callback');
      notificationPageCallbackRef.current = null;
    };
  }, []);

  // Force sync all notification data (useful for pull-to-refresh)
  const forceSyncAll = useCallback(() => {
    console.log('🔔 Force syncing all notification data');
    queryClient.invalidateQueries({ 
      queryKey: notificationQueryKeys.all,
      refetchType: 'all' // Refetch even if no components are mounted
    });
  }, [queryClient]);

  // Sync specific notification type
  const syncNotificationType = useCallback((type: string) => {
    console.log('🔔 Syncing specific notification type:', type);
    handleNotificationReceived({ type });
  }, [handleNotificationReceived]);

  return {
    registerNotificationPageCallback,
    forceSyncAll,
    syncNotificationType,
  };
};

// App-level push notification setup hook
export const useAppPushNotificationSetup = () => {
  const { userId } = useAuthSession();
  
  useEffect(() => {
    if (!userId) return;
    
    console.log('🔔 Setting up app-level push notifications');
    
    // Request permissions on app start
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('🔔 Push notification permissions not granted');
        return;
      }
      
      console.log('🔔 Push notification permissions granted');
    };
    
    requestPermissions();
  }, [userId]);
};