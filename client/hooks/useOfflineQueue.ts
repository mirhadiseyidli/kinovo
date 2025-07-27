import { useState, useEffect, useCallback } from 'react';
import { getQueueStatus, clearOfflineQueue, removeMutationFromQueue } from '@/utils/offlineMutationQueue';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook for monitoring and managing the offline mutation queue
 * 
 * This hook provides real-time information about the offline queue state
 * and allows components to interact with the queue.
 */

interface OfflineQueueStatus {
  size: number;
  processing: boolean;
  mutations: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    entityType: 'event' | 'user' | 'notification';
    timestamp: number;
    retryCount: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const useOfflineQueue = () => {
  const [queueStatus, setQueueStatus] = useState<OfflineQueueStatus>({
    size: 0,
    processing: false,
    mutations: [],
  });

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  });

  const [isOnline, setIsOnline] = useState(true);

  // Update queue status
  const updateQueueStatus = useCallback(() => {
    const status = getQueueStatus();
    setQueueStatus(status);
  }, []);

  // Set up network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type || 'unknown',
      });

      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);

      // Update queue status when network changes
      updateQueueStatus();
    });

    return unsubscribe;
  }, [updateQueueStatus]);

  // Set up periodic queue status updates
  useEffect(() => {
    const interval = setInterval(updateQueueStatus, 2000); // Update every 2 seconds
    
    // Initial update
    updateQueueStatus();

    return () => clearInterval(interval);
  }, [updateQueueStatus]);

  // Clear the entire offline queue
  const clearQueue = useCallback(async () => {
    try {
      await clearOfflineQueue();
      updateQueueStatus();
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }, [updateQueueStatus]);

  // Remove a specific mutation from the queue
  const removeMutation = useCallback(async (mutationId: string) => {
    try {
      await removeMutationFromQueue(mutationId);
      updateQueueStatus();
    } catch (error) {
      console.error('Failed to remove mutation from queue:', error);
    }
  }, [updateQueueStatus]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const stats = {
      total: queueStatus.size,
      byType: {
        create: queueStatus.mutations.filter(m => m.type === 'create').length,
        update: queueStatus.mutations.filter(m => m.type === 'update').length,
        delete: queueStatus.mutations.filter(m => m.type === 'delete').length,
      },
      byPriority: {
        high: queueStatus.mutations.filter(m => m.priority === 'high').length,
        medium: queueStatus.mutations.filter(m => m.priority === 'medium').length,
        low: queueStatus.mutations.filter(m => m.priority === 'low').length,
      },
      byEntity: {
        event: queueStatus.mutations.filter(m => m.entityType === 'event').length,
        user: queueStatus.mutations.filter(m => m.entityType === 'user').length,
        notification: queueStatus.mutations.filter(m => m.entityType === 'notification').length,
      },
    };

    return stats;
  }, [queueStatus]);

  // Get the oldest mutation in the queue
  const getOldestMutation = useCallback(() => {
    if (queueStatus.mutations.length === 0) return null;
    
    return queueStatus.mutations.reduce((oldest, current) => 
      current.timestamp < oldest.timestamp ? current : oldest
    );
  }, [queueStatus.mutations]);

  // Get mutations with high retry count (potential issues)
  const getProblematicMutations = useCallback(() => {
    return queueStatus.mutations.filter(m => m.retryCount >= 3);
  }, [queueStatus.mutations]);

  // Check if queue has pending mutations
  const hasPendingMutations = queueStatus.size > 0;

  // Check if queue is currently processing
  const isProcessing = queueStatus.processing;

  return {
    // Queue status
    queueStatus,
    hasPendingMutations,
    isProcessing,
    
    // Network status
    networkStatus,
    isOnline,
    
    // Queue management
    clearQueue,
    removeMutation,
    updateQueueStatus,
    
    // Queue analytics
    getQueueStats,
    getOldestMutation,
    getProblematicMutations,
    
    // Derived state
    isOffline: !isOnline,
    canSync: isOnline && hasPendingMutations,
  };
};

/**
 * Hook for showing offline queue notifications
 */
export const useOfflineQueueNotifications = () => {
  const { 
    hasPendingMutations, 
    isOnline, 
    queueStatus,
    getProblematicMutations 
  } = useOfflineQueue();

  const [showOfflineNotification, setShowOfflineNotification] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  // Show offline notification when there are pending mutations and we're offline
  useEffect(() => {
    setShowOfflineNotification(hasPendingMutations && !isOnline);
  }, [hasPendingMutations, isOnline]);

  // Show sync notification when we come back online with pending mutations
  useEffect(() => {
    if (isOnline && hasPendingMutations) {
      setShowSyncNotification(true);
      
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setShowSyncNotification(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setShowSyncNotification(false);
    }
  }, [isOnline, hasPendingMutations]);

  // Get notification messages
  const getNotificationMessages = useCallback(() => {
    const problematicMutations = getProblematicMutations();
    
    return {
      offline: hasPendingMutations 
        ? `${queueStatus.size} action${queueStatus.size > 1 ? 's' : ''} pending. Will sync when online.`
        : 'You\'re offline. Changes will sync when connection returns.',
      
      sync: `Syncing ${queueStatus.size} pending action${queueStatus.size > 1 ? 's' : ''}...`,
      
      problems: problematicMutations.length > 0
        ? `${problematicMutations.length} action${problematicMutations.length > 1 ? 's' : ''} failed to sync. Check your connection.`
        : null,
    };
  }, [hasPendingMutations, queueStatus.size, getProblematicMutations]);

  return {
    showOfflineNotification,
    showSyncNotification,
    getNotificationMessages,
  };
};