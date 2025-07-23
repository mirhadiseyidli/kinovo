import { QueryClient } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

/**
 * Test Setup for TanStack Query with MSW
 * 
 * This module provides setup utilities for testing TanStack Query
 * with Mock Service Worker and comprehensive test helpers.
 */

// Setup MSW server
export const server = setupServer(...handlers);

// Create a clean query client for each test
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Disable error logging during tests
    },
  });
};

// Global test setup
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  // Reset any request handlers that we may add during the tests
  server.resetHandlers();
});

afterAll(() => {
  // Clean up after the tests are finished
  server.close();
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

// Mock AsyncStorage for React Native
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((platforms) => platforms.ios),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  Alert: {
    alert: jest.fn(),
  },
  NetInfo: {
    addEventListener: jest.fn(),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  Stack: {
    Screen: jest.fn(),
  },
}));

// Mock authentication
jest.mock('@/components/Auth/AuthProvider', () => ({
  useAuthSession: jest.fn(() => ({
    accessToken: { current: 'mock-token' },
    isLoading: false,
  })),
}));

// Mock JWT decode
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(() => ({
    _id: 'mock-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
  })),
}));

// Test utilities
export const waitForQueryToSettle = async (queryClient: QueryClient, queryKey: unknown[]) => {
  await new Promise((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query?.queryKey.toString() === queryKey.toString() &&
        event.query?.state.status !== 'loading'
      ) {
        unsubscribe();
        resolve(undefined);
      }
    });
  });
};

export const waitForMutationToSettle = async (queryClient: QueryClient, mutationKey: unknown[]) => {
  await new Promise((resolve) => {
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.mutation?.options.mutationKey?.toString() === mutationKey.toString() &&
        event.mutation?.state.status !== 'loading'
      ) {
        unsubscribe();
        resolve(undefined);
      }
    });
  });
};

// Mock data generators
export const generateMockEvent = (overrides = {}) => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Mock Event',
  description: 'This is a mock event for testing',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  location: 'Mock Location',
  latitude: 37.7749,
  longitude: -122.4194,
  category: 'social',
  isPublic: true,
  createdBy: 'mock-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  participants: ['mock-user-id'],
  images: [],
  maxParticipants: 100,
  isRecurring: false,
  recurringPattern: null,
  ...overrides,
});

export const generateMockEvents = (count: number) => {
  return Array.from({ length: count }, (_, index) =>
    generateMockEvent({
      id: `event-${index}`,
      title: `Mock Event ${index + 1}`,
    })
  );
};

export const generateMockPaginatedResponse = (events: any[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageEvents = events.slice(start, end);
  
  return {
    events: pageEvents,
    totalCount: events.length,
    hasMore: end < events.length,
    currentPage: page,
    totalPages: Math.ceil(events.length / limit),
  };
};

// Performance testing utilities
export const measureQueryPerformance = async (
  queryClient: QueryClient,
  queryKey: unknown[],
  queryFn: () => Promise<any>
) => {
  const startTime = performance.now();
  
  await queryClient.fetchQuery({
    queryKey,
    queryFn,
  });
  
  const endTime = performance.now();
  return endTime - startTime;
};

export const measureMutationPerformance = async (
  mutation: any,
  variables: any
) => {
  const startTime = performance.now();
  
  await mutation.mutateAsync(variables);
  
  const endTime = performance.now();
  return endTime - startTime;
};

// Cache inspection utilities
export const getCacheState = (queryClient: QueryClient, queryKey: unknown[]) => {
  const query = queryClient.getQueryCache().find({ queryKey });
  return query ? query.state : null;
};

export const getCacheData = (queryClient: QueryClient, queryKey: unknown[]) => {
  return queryClient.getQueryData(queryKey);
};

export const getAllCacheKeys = (queryClient: QueryClient) => {
  return queryClient.getQueryCache().getAll().map(query => query.queryKey);
};

export const clearAllCache = (queryClient: QueryClient) => {
  queryClient.getQueryCache().clear();
  queryClient.getMutationCache().clear();
};

// Error simulation utilities
export const simulateNetworkError = () => {
  return new Error('Network request failed');
};

export const simulateServerError = (status: number = 500) => {
  const error = new Error(`Server error: ${status}`);
  (error as any).status = status;
  return error;
};

export const simulateTimeoutError = () => {
  const error = new Error('Request timeout');
  (error as any).code = 'TIMEOUT';
  return error;
};

// Optimistic update testing utilities
export const captureOptimisticUpdates = (queryClient: QueryClient, queryKey: unknown[]) => {
  const updates: any[] = [];
  
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.query?.queryKey.toString() === queryKey.toString()
    ) {
      updates.push({
        timestamp: Date.now(),
        data: event.query.state.data,
        status: event.query.state.status,
      });
    }
  });
  
  return {
    updates,
    stop: unsubscribe,
  };
};

export const waitForOptimisticUpdate = async (
  queryClient: QueryClient,
  queryKey: unknown[],
  timeout: number = 5000
) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Optimistic update timeout'));
    }, timeout);
    
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query?.queryKey.toString() === queryKey.toString()
      ) {
        clearTimeout(timer);
        unsubscribe();
        resolve(event.query.state.data);
      }
    });
  });
};

// Test debugging utilities
export const logCacheState = (queryClient: QueryClient, label: string = 'Cache State') => {
  const queries = queryClient.getQueryCache().getAll();
  const mutations = queryClient.getMutationCache().getAll();
  
  console.log(`\n=== ${label} ===`);
  console.log('Queries:', queries.map(q => ({
    queryKey: q.queryKey,
    status: q.state.status,
    dataUpdatedAt: q.state.dataUpdatedAt,
  })));
  console.log('Mutations:', mutations.map(m => ({
    mutationKey: m.options.mutationKey,
    status: m.state.status,
    submittedAt: m.state.submittedAt,
  })));
  console.log('=================\n');
};

export const createTestSnapshot = (queryClient: QueryClient) => {
  const queries = queryClient.getQueryCache().getAll();
  const mutations = queryClient.getMutationCache().getAll();
  
  return {
    timestamp: Date.now(),
    queries: queries.map(q => ({
      queryKey: q.queryKey,
      state: q.state,
    })),
    mutations: mutations.map(m => ({
      mutationKey: m.options.mutationKey,
      state: m.state,
    })),
  };
};

// Export all utilities
export * from '../mocks/handlers';
export * from '../mocks/mockData';