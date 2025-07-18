import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data stays fresh (no refetch)
      staleTime: 1000 * 60 * 2, // 2 minutes default
      // Cache time - how long data stays in memory when not in use
      cacheTime: 1000 * 60 * 10, // 10 minutes default
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
      // Error handling
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      // Error handling
      onError: (error) => {
        console.error('Mutation error:', error);
      },
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