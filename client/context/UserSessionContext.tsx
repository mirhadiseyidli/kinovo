import React, { ReactNode } from 'react';
import { EventProvider, useEventContext as useEventContextOriginal } from './EventContext';
import { NotificationProvider, useNotifications as useNotificationsOriginal } from './NotificationContext';
import { LocationProvider, useLocation as useLocationOriginal } from './LocationContext';

/**
 * UserSessionProvider - Consolidated provider for authenticated user data
 * 
 * This provider combines:
 * - EventProvider: Event data, caching, CRUD operations
 * - NotificationProvider: Firebase notifications, friend requests  
 * - LocationProvider: Location permissions
 * 
 * Benefits:
 * - Reduces provider nesting from 6 levels to 3 levels
 * - Only loads for authenticated users
 * - Maintains backward compatibility with existing hooks
 */
export const UserSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LocationProvider>
      <EventProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </EventProvider>
    </LocationProvider>
  );
};

// Re-export hooks for backward compatibility
export const useEventContext = useEventContextOriginal;
export const useNotifications = useNotificationsOriginal;
export const useLocation = useLocationOriginal; 