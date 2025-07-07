import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuthSession } from './Auth/AuthProvider';
import { db, firebaseAuth } from '@/config/firebase';
import {
  ref,
  set,
  update,
  onDisconnect,
  serverTimestamp,
  onValue
} from '@react-native-firebase/database';
import { useNotifications } from '@/context/UserSessionContext';
import { useFCMTokenManager } from '@/hooks/useFCMTokenManager';

// // Separate component for listening to notifications
// export function NotificationListener() {
//   const { userId } = useAuthSession();
//   const [isFirebaseReady, setIsFirebaseReady] = useState(false);
//   const { refreshData } = useNotifications();

//   // Check if Firebase is authenticated
//   useEffect(() => {
//     const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
//       setIsFirebaseReady(!!user);
//     });
    
//     return () => unsubscribe();
//   }, []);

//   // Listen for real-time notification updates
//   useEffect(() => {
//     if (!userId || !isFirebaseReady) return;

//     // Create a reference to the user's notifications
//     const notificationsRef = ref(db, `notifications/${userId}`);
    
//     // Set up real-time listener
//     const unsubscribe = onValue(notificationsRef, (snapshot) => {
//       // Force refresh data when notifications change
//       console.log('Notification update detected in global listener - refreshing data');
//       refreshData();
      
//       // The NotificationContext will automatically react to Firebase changes
//     }, (error) => {
//       console.error('Error in global notification listener:', error);
//     });
    
//     return () => {
//       unsubscribe();
//     };
//   }, [userId, isFirebaseReady, refreshData]);
  
//   return <NotificationBannerManager />;
// }

export function UserPresence() {
  const { userId } = useAuthSession();
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  
  // Initialize FCM token management
  const { fcmToken, permissionGranted, isLoading: fcmLoading } = useFCMTokenManager();

  // Check if Firebase is authenticated
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      setIsFirebaseReady(!!user);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    
    // Only proceed if both userId exists and Firebase is authenticated
    if (!userId || !isFirebaseReady) {
      return;
    }

    const userStatusRef = ref(db, `user_status/${userId}`);

    const setUserOnline = async () => {
      try {
        
        const statusData = {
          online: true,
          lastActive: serverTimestamp(),
        };
        
        await set(userStatusRef, statusData);

        // Setup onDisconnect behavior
        const disconnectRef = onDisconnect(userStatusRef);
        await disconnectRef.update({
          online: false,
          lastActive: serverTimestamp(),
        });
      } catch (error) {
        console.error('UserPresence: Error updating online status:', error);
        console.error('UserPresence: Error details:', error instanceof Error ? error.message : 'Unknown error', (error as any)?.code);
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setUserOnline();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        update(userStatusRef, {
          online: false,
          lastActive: serverTimestamp(),
        });
      }
    };

    setUserOnline();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      update(userStatusRef, {
        online: false,
        lastActive: serverTimestamp(),
      });
    };
  }, [userId, isFirebaseReady]);

  // return <NotificationListener />;
  return null; // This component only handles side effects
}