import { useEffect, useState, useCallback } from 'react';
import { db } from '@/config/firebase';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { ref, onValue, update } from '@react-native-firebase/database';

// Generic hook for Firebase Realtime Database
export function useFirebaseRealtimeData<T>(path: string, maxRetries = 3) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { userId } = useAuthSession();
  const [retryCount, setRetryCount] = useState(0);
     
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
  
    const fullPath = `${path}/${userId}`;
    const dbRef = ref(db, fullPath);
  
    const unsubscribe = onValue(
      dbRef,
      snapshot => {
        setData(snapshot.val() as T);
        setLoading(false);
        setRetryCount(0);
      },
      err => {
        setError(err);
        setLoading(false);
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
        }
      }
    );
  
    return () => {
      unsubscribe();
    };
  }, [path, userId, retryCount, maxRetries]);

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