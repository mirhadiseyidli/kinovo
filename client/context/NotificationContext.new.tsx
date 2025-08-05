import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationSystem } from '@/hooks/useNotificationSystem.new';
import { usePushNotificationSync, useAppPushNotificationSetup } from '@/hooks/usePushNotificationSync.new';
import { NotificationData, FriendRequestNotification } from '@/types/allTypes';

// Simplified notification context interface
interface NotificationContextType {
  // Data
  notifications: NotificationData[];
  friendRequests: FriendRequestNotification[];
  
  // Loading states
  loading: boolean;
  refreshing?: boolean; // For backward compatibility
  
  // Counts
  unseenNotificationCount: number;
  totalNotificationCount: number;
  unseenNotificationsCount: number;
  unseenFriendRequestsCount: number;
  totalUnseenCount: number;
  
  // Actions
  markNotificationAsViewed: (notificationId: string) => void;
  markAllNotificationsAsViewed: () => void;
  markFriendRequestsAsViewed: () => void; // For backward compatibility
  handleAcceptFriendRequest: (senderId: string) => void;
  handleDeclineFriendRequest: (senderId: string) => void;
  refreshData: () => Promise<void>;
  getFormattedNotificationContent: (notification: NotificationData) => { title: string; subtitle?: string };
  
  // Push notification integration
  registerNotificationPageCallback: (callback: (type: string) => void) => () => void;
  handlePushNotificationReceived?: (data: any) => void; // For backward compatibility
  
  // Loading states for actions
  markingAsRead: boolean;
  markingAllAsRead: boolean;
  acceptingFriendRequest: boolean;
  decliningFriendRequest: boolean;
  pushFetchLoading: boolean; // For backward compatibility
  
  // Additional properties for backward compatibility
  viewedNotifications: Set<string>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Internal provider component that uses the new hooks
const NotificationProviderInternal: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Set up app-level push notification configuration
  useAppPushNotificationSetup();
  
  // Use the new notification system
  const {
    notifications,
    friendRequests,
    loading,
    unseenNotificationsCount,
    unseenFriendRequestsCount,
    totalNotificationCount,
    totalUnseenCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    refreshData,
    getFormattedNotificationContent,
    markingAsRead,
    markingAllAsRead,
    acceptingFriendRequest,
    decliningFriendRequest,
  } = useNotificationSystem();
  
  // Set up push notification sync
  const { registerNotificationPageCallback } = usePushNotificationSync();
  
  // Backward compatibility wrappers
  const markNotificationAsViewed = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };
  
  const markAllNotificationsAsViewed = () => {
    markAllNotificationsAsRead();
  };
  
  // For backward compatibility - friend requests are automatically "viewed" when fetched
  const markFriendRequestsAsViewed = () => {
    // No-op since friend requests don't have a "viewed" state in the new system
    // They're only removed when accepted/declined
  };
  
  // Create a mock viewed notifications set for backward compatibility
  const viewedNotifications = new Set(
    notifications.filter(n => n.is_seen).map(n => n._id)
  );

  const value: NotificationContextType = {
    // Data
    notifications,
    friendRequests,
    
    // Loading states
    loading,
    refreshing: loading, // Map loading to refreshing for backward compatibility
    
    // Counts
    unseenNotificationCount: totalUnseenCount, // Main count used by app
    totalNotificationCount,
    unseenNotificationsCount,
    unseenFriendRequestsCount,
    totalUnseenCount,
    
    // Actions
    markNotificationAsViewed,
    markAllNotificationsAsViewed,
    markFriendRequestsAsViewed,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    refreshData,
    getFormattedNotificationContent,
    
    // Push notification integration
    registerNotificationPageCallback,
    
    // Loading states for actions
    markingAsRead,
    markingAllAsRead,
    acceptingFriendRequest,
    decliningFriendRequest,
    pushFetchLoading: loading, // Map loading for backward compatibility
    
    // Backward compatibility
    viewedNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Main provider that includes QueryClient setup
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NotificationProviderInternal>
      {children}
    </NotificationProviderInternal>
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

// Export for backward compatibility
export { useNotifications as useNotificationContext };