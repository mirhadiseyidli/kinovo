import { useEffect, useState, useCallback, useRef } from 'react';
import { db, firebaseAuth } from '@/config/firebase';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { ref, onValue, update } from '@react-native-firebase/database';

// Generic hook for Firebase Realtime Database
export function useFirebaseRealtimeData<T>(path: string, maxRetries = 3) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFirebaseAuthenticated, setIsFirebaseAuthenticated] = useState<boolean>(false);
  const { userId } = useAuthSession();
  
  // Use refs instead of state for retry logic to avoid re-renders
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const notificationsRefRef = useRef<any>(null);
  
  // Check Firebase auth state
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (mountedRef.current) {
        setIsFirebaseAuthenticated(!!user);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Reset retry counter on dependency changes
    retryCountRef.current = 0;
    mountedRef.current = true;
    
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Don't proceed if missing user ID or not authenticated with Firebase
    if (!userId || !isFirebaseAuthenticated) {
      setLoading(false);
      return;
    }

    // Check if path is undefined before proceeding
    if (!path) {
      setError(new Error('Firebase path is undefined'));
      setLoading(false);
      return;
    }
  
    const fullPath = `${path}/${userId}`;
    const dbRef = ref(db, fullPath);
    
    // Function to handle the subscription
    const setupSubscription = () => {
      try {
        return onValue(
          dbRef,
          snapshot => {
            if (!mountedRef.current) return;
            
            setData(snapshot.val() as T);
            setLoading(false);
            setError(null);
            retryCountRef.current = 0; // Reset retry count on success
          },
          err => {
            if (!mountedRef.current) return;
            
            console.error(`Firebase error at ${fullPath}:`, err);
            setError(err);
            setLoading(false);
            
            // Don't retry for permission denied errors
            const errorMessage = err?.message || '';
            if (errorMessage.includes('permission-denied')) {
              return;
            }
            
            // Implement exponential backoff
            const currentRetryCount = retryCountRef.current;
            
            if (currentRetryCount < maxRetries) {
              const nextRetry = currentRetryCount + 1;
              const backoffTime = Math.min(1000 * (2 ** currentRetryCount), 30000); // Max 30 seconds
              
              // Clear previous timeout if exists
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              
              // Set new timeout with exponential backoff
              timeoutRef.current = setTimeout(() => {
                if (!mountedRef.current) return;
                
                // Increment counter before retrying
                retryCountRef.current = nextRetry;
                
                // Cleanup previous subscription
                if (unsubscribe) {
                  unsubscribe();
                }
                
                // Setup new subscription
                unsubscribe = setupSubscription();
              }, backoffTime);
            } else {
              console.log(`Max retries (${maxRetries}) reached for ${fullPath}`);
            }
          }
        );
      } catch (setupError) {
        if (!mountedRef.current) return () => {};
        
        console.error('Error setting up Firebase subscription:', setupError);
        setError(setupError instanceof Error ? setupError : new Error('Unknown error'));
        setLoading(false);
        return () => {};
      }
    };
    
    // Initialize subscription
    let unsubscribe = setupSubscription();
  
    // Cleanup function
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (notificationsRefRef.current) {
        try {
          notificationsRefRef.current.keepSynced(false);
        } catch (error) {
          console.error('Error disabling keepSynced:', error);
        }
        notificationsRefRef.current = null;
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [path, userId, maxRetries, isFirebaseAuthenticated]);

  return { data, loading, error };
}

// Update a node in the Firebase database
export function useFirebaseUpdate() {
  const { userId } = useAuthSession();
  
  const updateData = useCallback(async (
    path: string, 
    nodeId: string, 
    updates: Record<string, any>
  ) => {
    if (!userId) return false;
    
    try {
      const fullPath = `${path}/${userId}/${nodeId}`;
      await update(ref(db, fullPath), updates);
      return true;
    } catch (error) {
      console.error(`Error updating Firebase data at ${path}/${userId}/${nodeId}:`, error);
      return false;
    }
  }, [userId]);
  
  return { updateData };
}

// Specific hooks for different data types
export function useFriendRequests() {
  return useFirebaseRealtimeData<Record<string, any>>('friend_requests');
}

export function useFriendActivities() {
  return useFirebaseRealtimeData<Record<string, any>>('friend_activities');
}

export function useNotifications() {
  const { data, loading, error } = useFirebaseRealtimeData<Record<string, any>>('notifications');
  const { updateData } = useFirebaseUpdate();
  const { userId } = useAuthSession();
  const notificationsRefRef = useRef<any>(null);
  
  // Force a refresh of the data when the component mounts
  useEffect(() => {
    // This will ensure that the Firebase connection is established and data is fresh
    // This helps with the initial load and when returning to the app after it's been in the background
    const forceFetch = async () => {
      if (!userId) return;
      
      try {
        // Force a refresh by detaching and reattaching the listener
        const notificationsRef = ref(db, `notifications/${userId}`);
        notificationsRefRef.current = notificationsRef;
        
        // Request a refresh from the server immediately
        await notificationsRef.keepSynced(true);
      } catch (error) {
        console.error('Error forcing notification refresh:', error);
      }
    };
    
    forceFetch();
  }, [userId]);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Update both 'read' and 'is_seen' properties to ensure compatibility
    return updateData('notifications', notificationId, { 
      read: true,
      is_seen: true 
    });
  }, [updateData]);
  
  return { 
    notifications: data, 
    loading, 
    error, 
    markAsRead 
  };
}

export function useAISummary() {
  return useFirebaseRealtimeData<{ content: string, timestamp: number }>('ai_summaries');
}

export function useUserStatus() {
  const { data, loading, error } = useFirebaseRealtimeData<Record<string, { online: boolean, lastActive: number }>>('user_status');
  
  return {
    onlineUsers: data,
    loading,
    error
  };
}