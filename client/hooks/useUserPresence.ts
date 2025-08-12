import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

interface UserPresence {
  userId: string;
  online: boolean;
  lastActive: string;
}

export function useUserPresence() {
  const { userId } = useAuthSession();
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use refs to track intervals
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Send heartbeat to server
  const sendHeartbeat = useCallback(async () => {
    if (!userId || !mountedRef.current) return;

    try {
      await api.post('/api/push-fetch/presence/heartbeat');
      setIsOnline(true);
      setError(null);
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
      if (mountedRef.current) {
        setError(error as Error);
      }
    }
  }, [userId]);

  // Set user offline
  const setUserOffline = useCallback(async () => {
    if (!userId || !mountedRef.current) {
      return;
    }

    try {
      await api.post('/api/push-fetch/presence/offline');
      setIsOnline(false);
    } catch (error) {
      console.error('Failed to set user offline:', error);
    }
  }, [userId]);


  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'active') {
      // App became active - send heartbeat and start interval
      sendHeartbeat();
      
      // Start heartbeat interval (every 5 minutes)
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000);
      
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background or inactive - stop heartbeat and set offline immediately
      // iOS suspends JS execution in background, so we do this immediately
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Set user offline immediately when app goes to background/inactive
      setUserOffline();
    }
  }, [sendHeartbeat, setUserOffline]);

  // Initialize presence system
  const initializePresence = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Send initial heartbeat
      await sendHeartbeat();
      
      // Start heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Error initializing presence:', error);
      if (mountedRef.current) {
        setError(error as Error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, sendHeartbeat]);

  // Initialize presence when user is available
  useEffect(() => {
    mountedRef.current = true;
    initializePresence();
    
    return () => {
      mountedRef.current = false;
    };
  }, [initializePresence]);

  // Setup app state listener
  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [userId, handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      // Set mounted to false (offline cleanup is handled by AuthProvider.signOut)
      mountedRef.current = false;
    };
  }, [userId]);

  return {
    isOnline,
    loading,
    error,
    sendHeartbeat
  };
}