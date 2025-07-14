import messaging from '@react-native-firebase/messaging';
import { NavigationAction } from '@react-navigation/native';

// Background message handler
messaging().setBackgroundMessageHandler(async remoteMessage => {
  
  // You can process the notification here
  // For example, update local storage, show local notification, etc.
  
  // The notification will automatically appear in the notification tray
  // due to the notification payload from the server
});

// Handle notification opened from killed state
export const getInitialNotification = async () => {
  const remoteMessage = await messaging().getInitialNotification();
  
  if (remoteMessage) {
    return remoteMessage;
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