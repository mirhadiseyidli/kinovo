import { QueryClient } from '@tanstack/react-query';
import { shouldPersistQuery } from './persistedQueryClient';
import { setupGlobalErrorHandling } from './errorHandling';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data stays fresh (no refetch)
      staleTime: 1000 * 60 * 2, // 2 minutes default
      // Cache time - how long data stays in memory when not in use
      gcTime: 1000 * 60 * 10, // 10 minutes default
      // Retry failed requests
      retry: (failureCount, error) => {
        // Don't retry on 401, 403, or 404 errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if ([401, 403, 404].includes(status)) {
            return false;
          }
        }
        return failureCount < 3;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on network reconnect
      refetchOnReconnect: true,
      // Background refetch interval (disabled by default)
      refetchInterval: false,
      // Persistence control - only persist queries that should be cached offline
      meta: {
        persist: (query: any) => shouldPersistQuery(query.queryKey),
      },
    },
    mutations: {
      // Enhanced retry with offline queue support (will be set up after initialization)
      retry: 3,
      // Network mode for offline support
      networkMode: 'offlineFirst',
    },
  },
});

// Development-specific configuration
if (__DEV__) {
  queryClient.setDefaultOptions({
    queries: {
      // Shorter stale time in development for easier testing
      staleTime: 1000 * 30, // 30 seconds
      // More aggressive refetching in development
      refetchOnWindowFocus: true,
    },
  });
}

// Set up offline mutation queue after queryClient is created
let offlineQueueCleanup: (() => void) | null = null;

export const setupOfflineQueue = async () => {
  try {
    const { startOfflineQueue } = await import('./offlineMutationQueue');
    
    // Update the default retry function to use offline queue
    queryClient.setDefaultOptions({
      mutations: {
        ...queryClient.getDefaultOptions().mutations,
        retry: (failureCount: number, error: Error) => {
          // Don't retry for certain HTTP status codes
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status as number;
            if ([400, 401, 403, 404, 422].includes(status)) {
              return false;
            }
          }
          return failureCount < 3;
        },
      },
    });

    // Start the offline queue system
    offlineQueueCleanup = await startOfflineQueue(queryClient);
    
  } catch (error) {
    console.error('Failed to initialize offline mutation queue:', error);
  }
};

// Set up global error handling
export const setupGlobalErrorHandlers = () => {
  try {
    setupGlobalErrorHandling(queryClient);
  } catch (error) {
    console.error('Failed to initialize global error handling:', error);
  }
};

// Cleanup function for offline queue
export const cleanupOfflineQueue = () => {
  if (offlineQueueCleanup) {
    offlineQueueCleanup();
    offlineQueueCleanup = null;
  }
};