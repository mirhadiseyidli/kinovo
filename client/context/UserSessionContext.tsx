import React, { ReactNode } from 'react';
import { NotificationProvider, useNotifications as useNotificationsOriginal } from './NotificationContext.new';
import { LocationProvider, useLocation as useLocationOriginal } from './LocationContext';

/**
 * UserSessionProvider - Consolidated provider for authenticated user data
 * 
 * This provider combines:
 * - NotificationProvider: Firebase notifications, friend requests  
 * - LocationProvider: Location permissions
 * 
 * Benefits:
 * - Reduces provider nesting from 3 levels to 2 levels
 * - Only loads for authenticated users
 * - EventContext removed - replaced by TanStack Query + useEventMutations
 */
export const UserSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LocationProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </LocationProvider>
  );
};

// Re-export hooks for backward compatibility
export const useNotifications = useNotificationsOriginal;
export const useLocation = useLocationOriginal; 