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

  console.log('UserPresence rendered - userId:', userId, 'isFirebaseReady:', isFirebaseReady, 'fcmToken:', !!fcmToken, 'permissionGranted:', permissionGranted);

  // Check if Firebase is authenticated
  useEffect(() => {
    console.log('Setting up Firebase auth listener');
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      console.log('Firebase auth state changed - user:', !!user);
      setIsFirebaseReady(!!user);
    });
    
    return () => {
      console.log('Cleaning up Firebase auth listener');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log('UserPresence effect - userId:', userId, 'isFirebaseReady:', isFirebaseReady);
    
    // Only proceed if both userId exists and Firebase is authenticated
    if (!userId || !isFirebaseReady) {
      console.log('UserPresence: Skipping setup - missing userId or Firebase not ready');
      return;
    }

    console.log('UserPresence: Setting up user status tracking for user:', userId);
    const userStatusRef = ref(db, `user_status/${userId}`);

    const setUserOnline = async () => {
      try {
        console.log('UserPresence: Setting user online for user:', userId);
        console.log('UserPresence: Firebase database ref:', userStatusRef.toString());
        
        const statusData = {
          online: true,
          lastActive: serverTimestamp(),
        };
        
        console.log('UserPresence: Attempting to set status data:', statusData);
        await set(userStatusRef, statusData);
        console.log('UserPresence: Successfully set user online');

        // Setup onDisconnect behavior
        console.log('UserPresence: Setting up onDisconnect behavior');
        const disconnectRef = onDisconnect(userStatusRef);
        await disconnectRef.update({
          online: false,
          lastActive: serverTimestamp(),
        });
        console.log('UserPresence: onDisconnect behavior set up');
      } catch (error) {
        console.error('UserPresence: Error updating online status:', error);
        console.error('UserPresence: Error details:', error instanceof Error ? error.message : 'Unknown error', (error as any)?.code);
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      console.log('UserPresence: App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('UserPresence: App became active, setting user online');
        setUserOnline();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('UserPresence: App went to background/inactive, setting user offline');
        update(userStatusRef, {
          online: false,
          lastActive: serverTimestamp(),
        });
      }
    };

    console.log('UserPresence: Setting initial online status');
    setUserOnline();

    console.log('UserPresence: Setting up AppState listener');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('UserPresence: Cleaning up - setting user offline');
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