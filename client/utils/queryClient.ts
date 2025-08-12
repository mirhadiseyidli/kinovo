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

// Simple persistence
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'kinovo-query-cache',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
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