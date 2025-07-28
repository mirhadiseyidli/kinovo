import { useAPNsTokenManager } from '@/hooks/useAPNsTokenManager';
import { useUserPresence } from '@/hooks/useUserPresence';

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
  // Initialize APNs token management (replaces FCM)
  useAPNsTokenManager();
  
  // Initialize user presence tracking (replaces Firebase presence)
  useUserPresence();

  return null; // This component only handles side effects
}