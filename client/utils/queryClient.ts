import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

// Simple persistence with dehydration options
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'kinovo-query-cache',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Don't persist infinite queries as they can't be properly restored
      // Infinite queries have their queryFn which can't be serialized
      const queryKey = query.queryKey;
      if (Array.isArray(queryKey) && queryKey.includes('infinite')) {
        return false;
      }
      // Only persist successful queries
      return query.state.status === 'success';
    },
  },
});

// Legacy exports for backward compatibility
export const setupOfflineQueue = () => {
  // This was removed in the simplified architecture
  console.log('setupOfflineQueue: Legacy function, no-op in new architecture');
};

export const setupGlobalErrorHandlers = () => {
  // This was removed in the simplified architecture
  console.log('setupGlobalErrorHandlers: Legacy function, no-op in new architecture');
};