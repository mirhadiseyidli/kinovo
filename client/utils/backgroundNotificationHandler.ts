import * as Notifications from 'expo-notifications';
import { NavigationAction } from '@react-navigation/native';
import api from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Background notification handler for push-to-fetch
export const setupBackgroundNotificationHandler = (onNotificationReceived?: (type: string) => void) => {
  return Notifications.addNotificationReceivedListener(async (notification) => {
    
    // Try to get data from multiple possible locations
    let data = notification.request.content.data;
    
    // If data is null, try accessing the payload directly (APNs specific)
    // Use type guard to safely check for payload property
    if (!data && notification.request.trigger && 'payload' in notification.request.trigger) {
      const triggerWithPayload = notification.request.trigger as { payload: Record<string, unknown> };
      data = triggerWithPayload.payload;
    }
    
    // If still no data, try accessing userInfo (APNs specific)
    // Use type guard to safely check for userInfo property
    if (!data && 'userInfo' in notification.request.content) {
      const contentWithUserInfo = notification.request.content as { userInfo: Record<string, unknown> };
      data = contentWithUserInfo.userInfo;
    }
    
    // Handle push-to-fetch: when notification is received, fetch fresh data
    if (data && data.type) {
      try {
        
        // Fetch data based on notification type
        switch (data.type) {
          case 'friend_request':
          case 'friend_request_accepted':
            await api.get('/api/push-fetch/friend-requests');
            break;
            
          case 'event_invitation':
          case 'event_updated':
          case 'event_reminder_10_mins':
          case 'event_reminder_1_hour':
          case 'event_attendance_confirmed':
          case 'new_event_from_friend':
          case 'new_event_nearby':
            await api.get('/api/push-fetch/notifications');
            break;
            
          case 'user_presence_update':
            await api.get('/api/push-fetch/presence');
            break;
            
          default:
            // Fetch general data
            await api.get('/api/push-fetch/data');
            break;
        }
        
        // Notify the UI to refresh
        if (onNotificationReceived && typeof data.type === 'string') {
          onNotificationReceived(data.type);
        }
      } catch (error) {
        console.error('❌ Background data fetch failed:', error);
      }
    }
  });
};

// Handle notification opened from killed state
export const getInitialNotification = async () => {
  const response = await Notifications.getLastNotificationResponseAsync();
  
  if (response) {
    return response.notification;
  }
  
  return null;
};

// Handle notification navigation
export const handleNotificationNavigation = (remoteMessage: any, navigation: any) => {
  if (!remoteMessage?.data) return;
  
  const { type, eventId, userId } = remoteMessage.data;
  
  switch (type) {
    case 'friend_request':
    case 'friend_request_accepted':
      if (userId) {
        navigation.navigate('(auth)', {
          screen: 'profile',
          params: { _id: userId }
        });
      }
      break;
      
    case 'event_invitation':
    case 'event_update':
    case 'event_reminder_10_mins':
    case 'event_reminder_1_hour':
      if (eventId) {
        navigation.navigate('(auth)', {
          screen: 'viewEvent',
          params: { event_id: eventId }
        });
      }
      break;
      
    default:
      // Navigate to notifications screen
      navigation.navigate('(auth)', {
        screen: '(notifications)',
        params: { screen: 'notifications' }
      });
      break;
  }
}; 