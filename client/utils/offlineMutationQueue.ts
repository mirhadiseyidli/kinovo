import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Offline Mutation Queue Implementation
 * 
 * This module implements TanStack Query's persistRetryer pattern for offline mutation handling.
 * It queues mutations when offline and automatically retries them when connectivity returns.
 */

// Types for offline mutation queue
interface OfflineMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'event' | 'user' | 'notification';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

interface MutationContext {
  optimisticData?: any;
  rollbackData?: any;
  queryKeysToInvalidate?: string[][];
}

// Offline mutation queue state
let offlineQueue: OfflineMutation[] = [];
let isProcessingQueue = false;
let connectivityCheckInterval: NodeJS.Timeout | null = null;

// Constants
const QUEUE_STORAGE_KEY = 'KINOVO_OFFLINE_MUTATION_QUEUE';
const MAX_QUEUE_SIZE = 100;
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Progressive delays
const QUEUE_PERSISTENCE_INTERVAL = 5000; // 5 seconds

/**
 * Creates a persistent mutation retryer for offline scenarios
 */
export const createOfflineMutationRetryer = (queryClient: QueryClient) => {
  return async (
    failureCount: number,
    error: any,
    mutation: any,
    context: MutationContext
  ): Promise<boolean> => {
    // Don't retry if we're online and got a non-network error
    if (await isOnline()) {
      // Don't retry for certain HTTP status codes
      if (error?.response?.status && [400, 401, 403, 404, 422].includes(error.response.status)) {
        return false;
      }
    }

    // Check if we should queue this mutation for offline retry
    if (!(await isOnline()) && failureCount < 3) {
      await queueMutationForOfflineRetry(mutation, context);
      return false; // Don't retry immediately, queue it instead
    }

    // Normal retry logic for online scenarios
    return failureCount < 3;
  };
};

/**
 * Queues a mutation for offline retry
 */
const queueMutationForOfflineRetry = async (
  mutation: any,
  context: MutationContext
): Promise<void> => {
  try {
    // Prevent queue overflow
    if (offlineQueue.length >= MAX_QUEUE_SIZE) {
      console.warn('Offline mutation queue is full, removing oldest item');
      offlineQueue.shift();
    }

    // Determine mutation type and priority
    const mutationType = determineMutationType(mutation);
    const priority = determinePriority(mutation);

    const offlineMutation: OfflineMutation = {
      id: `${Date.now()}-${Math.random()}`,
      type: mutationType.type,
      entityType: mutationType.entityType,
      data: mutation.variables,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      priority,
    };

    // Add to queue
    offlineQueue.push(offlineMutation);

    // Sort queue by priority and timestamp
    offlineQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });

    // Persist queue to storage
    await persistQueue();

    console.log(`Queued mutation for offline retry: ${offlineMutation.id}`);
  } catch (error) {
    console.error('Failed to queue mutation for offline retry:', error);
  }
};

/**
 * Determines mutation type from mutation object
 */
const determineMutationType = (mutation: any): { type: OfflineMutation['type'], entityType: OfflineMutation['entityType'] } => {
  const mutationKey = mutation.options?.mutationKey?.[0] || '';
  
  if (mutationKey.includes('create')) return { type: 'create', entityType: 'event' };
  if (mutationKey.includes('update')) return { type: 'update', entityType: 'event' };
  if (mutationKey.includes('delete')) return { type: 'delete', entityType: 'event' };
  
  // Default fallback
  return { type: 'create', entityType: 'event' };
};

/**
 * Determines priority based on mutation type
 */
const determinePriority = (mutation: any): OfflineMutation['priority'] => {
  const mutationKey = mutation.options?.mutationKey?.[0] || '';
  
  // High priority for user actions
  if (mutationKey.includes('create') || mutationKey.includes('update')) {
    return 'high';
  }
  
  // Medium priority for deletions
  if (mutationKey.includes('delete')) {
    return 'medium';
  }
  
  return 'low';
};

/**
 * Processes the offline mutation queue
 */
export const processOfflineQueue = async (queryClient: QueryClient): Promise<void> => {
  if (isProcessingQueue || offlineQueue.length === 0) {
    return;
  }

  // Check if we're online
  if (!(await isOnline())) {
    console.log('Still offline, skipping queue processing');
    return;
  }

  isProcessingQueue = true;
  console.log(`Processing offline queue with ${offlineQueue.length} mutations`);

  const processedMutations: string[] = [];
  const failedMutations: OfflineMutation[] = [];

  for (const queuedMutation of offlineQueue) {
    try {
      await processSingleMutation(queryClient, queuedMutation);
      processedMutations.push(queuedMutation.id);
      console.log(`Successfully processed offline mutation: ${queuedMutation.id}`);
    } catch (error) {
      console.error(`Failed to process offline mutation ${queuedMutation.id}:`, error);
      
      // Increment retry count
      queuedMutation.retryCount++;
      
      // Check if we should retry
      if (queuedMutation.retryCount < queuedMutation.maxRetries) {
        // Add delay before next retry
        const delay = RETRY_DELAYS[Math.min(queuedMutation.retryCount - 1, RETRY_DELAYS.length - 1)];
        setTimeout(() => {
          // Add back to queue for retry
          failedMutations.push(queuedMutation);
        }, delay);
      } else {
        console.warn(`Max retries reached for mutation ${queuedMutation.id}, discarding`);
      }
    }
  }

  // Remove processed mutations from queue
  offlineQueue = offlineQueue.filter(m => !processedMutations.includes(m.id));
  
  // Add failed mutations back to queue
  offlineQueue.push(...failedMutations);

  // Persist updated queue
  await persistQueue();

  isProcessingQueue = false;
  console.log(`Offline queue processing complete. Remaining: ${offlineQueue.length}`);
};

/**
 * Processes a single mutation from the queue
 */
const processSingleMutation = async (
  queryClient: QueryClient,
  mutation: OfflineMutation
): Promise<void> => {
  // Import mutation functions dynamically to avoid circular dependencies
  const { createEvent, updateEvent, deleteEvent } = await import('./queryFunctions');

  switch (mutation.type) {
    case 'create':
      if (mutation.entityType === 'event') {
        await createEvent(mutation.data);
        // Invalidate relevant queries
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }
      break;
    
    case 'update':
      if (mutation.entityType === 'event') {
        await updateEvent(mutation.data.id, mutation.data);
        // Invalidate relevant queries
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }
      break;
    
    case 'delete':
      if (mutation.entityType === 'event') {
        await deleteEvent(mutation.data.id);
        // Invalidate relevant queries
        await queryClient.invalidateQueries({ queryKey: ['events'] });
      }
      break;
    
    default:
      throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
};

/**
 * Checks if device is online
 */
const isOnline = async (): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true && netInfo.isInternetReachable === true;
  } catch (error) {
    console.error('Failed to check network status:', error);
    return false;
  }
};

/**
 * Persists the queue to AsyncStorage
 */
const persistQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(offlineQueue));
  } catch (error) {
    console.error('Failed to persist offline queue:', error);
  }
};

/**
 * Loads the queue from AsyncStorage
 */
const loadQueue = async (): Promise<void> => {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (queueData) {
      offlineQueue = JSON.parse(queueData);
      console.log(`Loaded ${offlineQueue.length} mutations from offline queue`);
    }
  } catch (error) {
    console.error('Failed to load offline queue:', error);
    offlineQueue = [];
  }
};

/**
 * Starts the offline mutation queue system
 */
export const startOfflineQueue = async (queryClient: QueryClient): Promise<() => void> => {
  // Load existing queue
  await loadQueue();

  // Set up connectivity monitoring
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      console.log('Device came online, processing offline queue');
      processOfflineQueue(queryClient);
    }
  });

  // Set up periodic queue persistence
  const persistInterval = setInterval(async () => {
    if (offlineQueue.length > 0) {
      await persistQueue();
    }
  }, QUEUE_PERSISTENCE_INTERVAL);

  // Return cleanup function
  return () => {
    unsubscribe();
    clearInterval(persistInterval);
  };
};

/**
 * Clears the offline mutation queue
 */
export const clearOfflineQueue = async (): Promise<void> => {
  offlineQueue = [];
  await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  console.log('Offline mutation queue cleared');
};

/**
 * Gets the current queue status
 */
export const getQueueStatus = (): {
  size: number;
  processing: boolean;
  mutations: OfflineMutation[];
} => {
  return {
    size: offlineQueue.length,
    processing: isProcessingQueue,
    mutations: [...offlineQueue], // Return copy to prevent mutation
  };
};

/**
 * Removes a specific mutation from the queue
 */
export const removeMutationFromQueue = async (mutationId: string): Promise<void> => {
  offlineQueue = offlineQueue.filter(m => m.id !== mutationId);
  await persistQueue();
  console.log(`Removed mutation ${mutationId} from offline queue`);
};