import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistent Query Client Setup
 * 
 * This creates a persisted version of React Query that saves cache data
 * to AsyncStorage for instant offline access when the app reopens.
 */

// Create the persister using AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'KINOVO_REACT_QUERY_OFFLINE_CACHE',
  // Serialize/deserialize functions for complex data types
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Export the persister for use in the main app component
export { PersistQueryClientProvider };

/**
 * Default persister options that can be customized per query
 */
export const defaultPersisterOptions = {
  // Maximum age for persisted data (24 hours)
  maxAge: 1000 * 60 * 60 * 24,
  // Whether to persist data when the app is backgrounded
  buster: '', // Can be used to bust cache when app version changes
  // Hyration options
  hydrateOptions: {
    // Whether to refetch queries after hydration
    defaultOptions: {
      queries: {
        // Refresh stale data after hydration
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  },
};

/**
 * Query keys that should be persisted
 * This allows fine-grained control over what gets cached offline
 */
export const persistedQueryKeys = [
  // User events - critical for offline access
  'events',
  // User profile data
  'user',
  // App configuration
  'config',
  // Recently viewed data
  'recent',
] as const;

/**
 * Query keys that should NOT be persisted
 * These are typically real-time or sensitive data
 */
export const excludedQueryKeys = [
  // Real-time notifications
  'notifications',
  // Sensitive user data (never persist auth data for security)
  'auth',
  'token',
  'session',
  'login',
  'refresh',
  // Search results (can be stale)
  'search',
  // Location-based data (can be stale)
  'location',
  // Temporary/transient data
  'temp',
  'loading',
] as const;

/**
 * Helper function to check if a query should be persisted
 */
export const shouldPersistQuery = (queryKey: unknown[]): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }

  const firstKey = queryKey[0];
  if (typeof firstKey !== 'string') {
    return false;
  }

  // Check if query key should be excluded
  if (excludedQueryKeys.some(excludedKey => firstKey.startsWith(excludedKey))) {
    return false;
  }

  // Check if query key should be persisted
  return persistedQueryKeys.some(persistedKey => firstKey.startsWith(persistedKey));
};

/**
 * Custom persister options for specific query types
 */
export const getQuerySpecificPersisterOptions = (queryKey: unknown[]) => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return defaultPersisterOptions;
  }

  const firstKey = queryKey[0];
  
  switch (firstKey) {
    case 'events':
      return {
        ...defaultPersisterOptions,
        // Events cache for longer (12 hours)
        maxAge: 1000 * 60 * 60 * 12,
      };
    
    case 'user':
      return {
        ...defaultPersisterOptions,
        // User data cache for longer (24 hours)
        maxAge: 1000 * 60 * 60 * 24,
      };
    
    default:
      return defaultPersisterOptions;
  }
};