# TanStack React Query Implementation - Modules Reference

This document provides a comprehensive reference for all TanStack React Query modules implemented in the Kinovo client application. Each module is designed to provide specific functionality while maintaining type safety, performance, and developer experience.

## Table of Contents

1. [Core Infrastructure](#core-infrastructure)
2. [Query Management](#query-management)  
3. [Mutation Management](#mutation-management)
4. [Cache Management](#cache-management)
5. [Development Tools](#development-tools)
6. [Error Handling](#error-handling)
7. [Performance Optimization](#performance-optimization)
8. [Testing Utilities](#testing-utilities)
9. [Examples](#examples)

## Core Infrastructure

### 1. Query Client Configuration (`utils/queryClient.ts`)

**Purpose**: Centralized configuration for TanStack React Query with optimized defaults, error handling, and retry logic.

**Key Functions**:
- `createQueryClient()`: Creates a configured QueryClient instance
- `setupGlobalErrorHandling()`: Configures global error handling for queries and mutations
- `setupMutationDefaults()`: Sets up default mutation behavior

**Configuration Features**:
```typescript
// Default query settings
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 minutes
    gcTime: 10 * 60 * 1000,          // 10 minutes garbage collection
    retry: 3,                        // Retry failed queries 3 times
    refetchOnWindowFocus: false,     // Don't refetch on window focus
    refetchOnReconnect: true,        // Refetch when reconnecting
  }
}
```

**Error Handling**:
- Automatic retry with exponential backoff
- Global error logging and telemetry
- Offline mutation queuing

---

### 2. Query Keys Management (`utils/queryKeys.ts`)

**Purpose**: Centralized query key factory with hierarchical structure for consistent cache management.

**Key Functions**:
- `queryKeys.all`: Base key for all queries
- `queryKeys.events`: Event-related queries
- `queryKeys.upcomingEvents(userId, options)`: User's upcoming events
- `queryKeys.eventById(eventId)`: Single event by ID
- `queryKeys.nearbyEvents(lat, lng, distance)`: Location-based events
- `queryKeys.friendsEvents(userId)`: Friends' events
- `queryKeys.invalidation`: Keys for cache invalidation strategies

**Hierarchical Structure**:
```typescript
queryKeys = {
  all: ['queries'],
  events: ['queries', 'events'],
  upcomingEvents: (userId: string) => [...queryKeys.events, 'upcoming', userId],
  eventById: (eventId: string) => [...queryKeys.events, 'detail', eventId],
  // ... more specific keys
}
```

**Benefits**:
- Type-safe query keys
- Hierarchical invalidation support
- Consistent naming conventions
- Easy cache inspection

---

### 3. API Integration (`utils/api.ts`)

**Purpose**: Enhanced Axios instance with TanStack integration, authentication, and error handling.

**Key Features**:
- Automatic JWT token injection
- Request/response interceptors
- Offline detection and queuing
- Error standardization
- Request deduplication

**Enhanced Functions**:
- Request timeout handling
- Automatic token refresh
- Network error detection
- Request/response logging (dev mode)

---

### 4. Persisted Query Client (`utils/persistedQueryClient.ts`)

**Purpose**: Offline-first caching with AsyncStorage persistence for mobile apps.

**Key Functions**:
- `createPersistedQueryClient()`: Creates a persisted query client
- `setupPersistence()`: Configures persistence options
- `createAsyncStoragePersister()`: Creates AsyncStorage persister

**Features**:
- Selective cache persistence
- Background synchronization
- Cache hydration on app startup
- Storage quota management

---

## Query Management

### 5. Query Functions (`utils/queryFunctions.ts`)

**Purpose**: Reusable query function factory with standardized error handling and response formatting.

**Key Functions**:
- `createQueryFunction(endpoint, options)`: Creates a standardized query function
- `handleQueryError(error)`: Standardized query error handling
- `formatQueryResponse(data)`: Response data formatting

**Benefits**:
- Consistent error handling across all queries
- Type-safe query functions
- Automatic retry logic
- Response normalization

---

### 6. Infinite Queries (`hooks/useInfiniteEventsQuery.ts`)

**Purpose**: Infinite scrolling implementation for large event lists with pagination support.

**Key Functions**:
- `useInfiniteUpcomingEventsQuery(options)`: Infinite query for upcoming events
- `useInfiniteNearbyEventsQuery(options)`: Infinite query for nearby events
- `useInfiniteFriendsEventsQuery(options)`: Infinite query for friends' events

**Features**:
```typescript
const {
  events,           // Flattened array of all events
  totalCount,       // Total count of events
  hasNextPage,      // Boolean indicating if more data is available
  fetchNextPage,    // Function to fetch next page
  isFetchingNextPage, // Loading state for next page
  refetch,          // Refetch all pages
  error             // Error state
} = useInfiniteUpcomingEventsQuery({ userId, pageSize: 10 });
```

**Advanced Features**:
- Virtual scrolling support
- Optimistic updates for mutations
- Background refetching
- Cache deduplication

---

### 7. Infinite Query Utils (`utils/infiniteQueryUtils.ts`)

**Purpose**: Utilities for managing infinite query cache updates and optimizations.

**Key Functions**:
- `updateInfiniteQueryCache(queryClient, queryType, newEvent, userId)`: Add event to cache
- `removeFromInfiniteQueryCache(queryClient, queryType, eventId, userId)`: Remove event from cache
- `updateInfiniteQueryCacheItem(queryClient, queryType, eventId, updatedEvent, userId)`: Update specific event
- `invalidateInfiniteQueries({ queryClient, userId })`: Smart invalidation

**Cache Operations**:
```typescript
// Add new event optimistically
updateInfiniteQueryCache(queryClient, 'upcoming', newEvent, userId);

// Remove event from all relevant caches
removeFromInfiniteQueryCache(queryClient, 'upcoming', eventId, userId);

// Update specific event across all caches
updateInfiniteQueryCacheItem(queryClient, 'nearby', eventId, updatedEvent, userId);
```

---

### 8. Smooth UI Queries (`hooks/useSmoothUIQueries.ts`)

**Purpose**: Enhanced query hooks with smooth transitions, skeleton states, and optimistic updates.

**Key Functions**:
- `useSmoothUpcomingEvents(options)`: Smooth upcoming events query
- `useSmoothEventDetails(eventId, options)`: Smooth single event query
- `useSmoothNearbyEvents(location, options)`: Smooth location-based query

**Smooth UI Features**:
```typescript
const {
  data,
  isLoading,
  isTransitioning,    // Smooth transition state
  placeholderData,    // Skeleton/placeholder data
  optimisticData,     // Optimistically updated data
  smoothRefetch       // Refetch with transition
} = useSmoothUpcomingEvents({ userId, enableTransitions: true });
```

---

### 9. Smooth UI Helpers (`utils/smoothUIHelpers.ts`)

**Purpose**: Helper functions for creating smooth UI transitions and placeholder data.

**Key Functions**:
- `createPlaceholderData`: Factory for generating skeleton data
- `createSmoothTransition(fromState, toState)`: Smooth state transitions
- `shouldUseOptimisticUpdate(mutationType)`: Optimistic update logic
- `mergePlaceholderWithReal(placeholder, real)`: Data merging strategies

**Placeholder Data Generators**:
```typescript
const placeholderData = {
  upcomingEvents: () => generateEventSkeletons(5),
  eventDetails: (eventId) => generateEventSkeleton(eventId),
  userProfile: (userId) => generateUserSkeleton(userId)
};
```

---

## Mutation Management

### 10. Typed Mutations (`hooks/useTypedMutations.ts`)

**Purpose**: Type-safe mutations with discriminated union states for better developer experience.

**Key Functions**:
- `useCreateEventMutation()`: Create event with type safety
- `useUpdateEventMutation()`: Update event with optimistic updates
- `useDeleteEventMutation()`: Delete event with cache cleanup
- `useEventAttendanceMutation()`: Join/leave event functionality

**Discriminated Union States**:
```typescript
type MutationState<T> = 
  | { type: 'idle' }
  | { type: 'loading'; progress?: number }
  | { type: 'success'; data: T }
  | { type: 'error'; error: Error; retryCount: number };
```

**Advanced Features**:
- Optimistic updates with automatic rollback
- Progress tracking for file uploads
- Retry mechanisms with exponential backoff
- Offline mutation queuing

---

### 11. CRUD Mutations (`hooks/useCrudMutations.ts`)

**Purpose**: Complete CRUD operations with optimistic updates and cache synchronization.

**Key Functions**:
- `useEventCrudMutations(options)`: Complete CRUD operations for events
- Returns: `{ createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent }`

**Options Configuration**:
```typescript
const crudMutations = useEventCrudMutations({
  userId: 'user123',
  enableOptimisticUpdates: true,
  invalidateQueries: true,
  onSuccess: (data, operation) => console.log(`${operation} successful`, data),
  onError: (error, operation) => console.error(`${operation} failed`, error)
});
```

**Features**:
- Optimistic UI updates
- Automatic cache invalidation
- Batch operations support
- Conflict resolution

---

### 12. Typed Mutation Factory (`utils/typedMutationFactory.ts`)

**Purpose**: Factory for creating type-safe mutations with consistent patterns.

**Key Functions**:
- `createTypedMutation(config)`: Create type-safe mutation
- `withOptimisticUpdate(mutation, updater)`: Add optimistic updates
- `withCacheInvalidation(mutation, invalidationStrategy)`: Add cache invalidation
- `withRetryLogic(mutation, retryConfig)`: Add retry logic

**Factory Configuration**:
```typescript
const eventMutation = createTypedMutation({
  mutationFn: createEventAPI,
  optimisticUpdate: {
    queryKey: queryKeys.upcomingEvents(userId),
    updater: (oldData, newEvent) => [...oldData, newEvent]
  },
  onSuccess: {
    invalidate: [queryKeys.upcomingEvents(userId)],
    refetch: [queryKeys.eventCount(userId)]
  }
});
```

---

## Cache Management

### 13. Cache Invalidation Strategies (`utils/cacheInvalidationStrategies.ts`)

**Purpose**: Sophisticated cache invalidation patterns for maintaining data consistency.

**Available Strategies**:

1. **Targeted Invalidation** (`targetedEventInvalidation`)
   - Invalidates only directly related queries
   - Minimal performance impact
   - Use for: Single event operations

2. **Cascading Invalidation** (`cascadingInvalidation`)  
   - Invalidates related data in layers
   - Ensures complete consistency
   - Use for: Operations affecting multiple users

3. **Selective Invalidation** (`selectiveInvalidation`)
   - Invalidates based on operation type
   - Optimizes for specific use cases
   - Use for: Type-specific operations

4. **Smart Invalidation** (`smartInvalidation`)
   - Uses dependency tracking
   - Automatic relationship detection
   - Use for: Complex data relationships

5. **Optimistic Invalidation** (`optimisticInvalidation`)
   - Optimistic updates with fallback
   - Best user experience
   - Use for: User-initiated actions

6. **Tag-Based Invalidation** (`tagBasedInvalidation`)
   - Groups queries by tags
   - Flexible invalidation patterns
   - Use for: Feature-based invalidation

7. **Dependency-Based Invalidation** (`dependencyBasedInvalidation`)
   - Maintains dependency graph
   - Automatic cascade resolution
   - Use for: Complex relationships

8. **Smart Prefetching** (`smartPrefetchingInvalidation`)
   - Invalidates and prefetches related data
   - Improved perceived performance
   - Use for: User-facing operations

9. **Cache Warming** (`cacheWarmingInvalidation`)
   - Immediate cache refresh
   - Critical data always fresh
   - Use for: Critical operations

**Usage Example**:
```typescript
import { executeInvalidationStrategy } from '@/utils/cacheInvalidationStrategies';

// Execute specific strategy
await executeInvalidationStrategy('optimistic', queryClient, {
  eventId: 'event123',
  userId: 'user456',
  eventType: 'create'
});

// Automatic strategy selection
const strategy = selectOptimalStrategy(context, {
  preferPerformance: true,
  enablePrefetching: true
});
```

---

### 14. Stable Query Keys (`utils/stableQueryKey.ts`)

**Purpose**: Consistent query key generation and hashing for reliable cache management.

**Key Functions**:
- `createStableQueryKey(components)`: Generate stable, hashable keys
- `hashQueryKey(queryKey)`: Create hash for query key comparison
- `normalizeQueryKey(queryKey)`: Normalize keys for consistency

**Benefits**:
- Consistent cache hits
- Reliable invalidation patterns
- Memory optimization
- Debug-friendly keys

---

## Development Tools

### 15. DevTools Integration (`utils/devtools.ts`)

**Purpose**: Development tools for debugging and monitoring React Query in development.

**Key Functions**:
- `performanceMonitor`: Query performance tracking
- `exportDevToolsState()`: Export debug information
- `getQueryInspector()`: Inspect query cache
- `getDevToolsLogs()`: Access debug logs

**Performance Monitoring**:
```typescript
// Track slow queries
performanceMonitor.logSlowQueries(100); // Log queries slower than 100ms

// Monitor cache metrics
performanceMonitor.logCacheMetrics();

// Custom performance timer
const timer = performanceMonitor.startTimer(['custom-operation']);
// ... operation
const duration = timer(); // Returns duration in ms
```

**Debug Features**:
- Query timeline visualization
- Cache state inspection
- Mutation tracking
- Performance bottleneck detection

---

### 16. DevTools Components (`components/DevTools/`)

**Purpose**: Visual components for debugging React Query in development.

**Components**:
- `DevToolsController`: Floating debug controls
- `DevToolsDebugInfo`: Real-time debug overlay
- `QueryInspector`: Cache inspection UI
- `MutationLogger`: Mutation activity log

**Features**:
- Real-time query monitoring
- Interactive cache inspection
- Performance metrics display
- Export debug data

---

## Error Handling

### 17. Error Handling System (`utils/errorHandling.ts`)

**Purpose**: Comprehensive error handling with categorization, recovery strategies, and user feedback.

**Key Functions**:
- `ErrorBoundary`: React error boundary for query errors
- `handleQueryError(error)`: Standardized query error handling
- `handleMutationError(error)`: Mutation-specific error handling
- `createErrorRecoveryStrategy(errorType)`: Automatic error recovery

**Error Categories**:
```typescript
enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  OFFLINE = 'offline'
}
```

**Recovery Strategies**:
- Automatic retry with backoff
- Offline queue for mutations
- Fallback data strategies
- User notification patterns

---

### 18. Error Boundary Components (`components/ErrorBoundary/`)

**Purpose**: React Error Boundaries specifically designed for React Query errors.

**Components**:
- `ErrorBoundary`: Main error boundary wrapper
- `GlobalErrorDisplay`: Global error notifications
- `QueryErrorFallback`: Query-specific error UI
- `MutationErrorHandler`: Mutation error recovery

**Features**:
- Graceful error fallbacks
- Error recovery options
- Debug information in development
- User-friendly error messages

---

## Performance Optimization

### 19. Offline Queue (`utils/offlineMutationQueue.ts`)

**Purpose**: Offline-first mutation queuing with automatic synchronization.

**Key Functions**:
- `OfflineMutationQueue`: Main queue manager
- `queueMutation(mutation)`: Add mutation to offline queue
- `syncQueuedMutations()`: Sync when online
- `clearQueue()`: Clear failed mutations

**Features**:
```typescript
const queue = new OfflineMutationQueue({
  maxRetries: 3,
  retryDelay: 1000,
  syncOnReconnect: true,
  persistQueue: true
});

// Queue mutation when offline
queue.queueMutation({
  mutationFn: createEventAPI,
  variables: eventData,
  optimisticUpdate: optimisticUpdateFn
});
```

---

### 20. Telemetry Integration (`hooks/useTelemetryHooks.ts`, `hooks/useTelemetryIntegration.ts`)

**Purpose**: Comprehensive telemetry and analytics integration for React Query operations.

**Key Functions**:

**Core Telemetry** (`useTelemetryHooks.ts`):
- `useTelemetry()`: Basic telemetry tracking
- `initializeTelemetry(providers)`: Setup telemetry providers
- `trackEvent(event, properties)`: Track custom events
- `trackError(error, context)`: Track errors
- `trackTiming(operation, duration)`: Track performance

**Advanced Integration** (`useTelemetryIntegration.ts`):
- `trackQueryError(error, queryKey, context)`: Query-specific error tracking
- `trackMutationError(error, mutationKey, context)`: Mutation error tracking
- `trackUserEngagement(action, properties)`: User interaction tracking
- `trackPerformanceMetrics()`: Automatic performance monitoring

**Provider Support**:
- Sentry integration
- New Relic integration
- Custom analytics providers
- Google Analytics integration

---

### 21. Telemetry Setup (`utils/telemetrySetup.ts`)

**Purpose**: Automatic telemetry integration with React Query lifecycle events.

**Features**:
- Query lifecycle tracking
- Mutation success/failure tracking
- Performance metric collection
- Error categorization and tracking
- User behavior analytics

**Auto-tracking**:
```typescript
// Automatically tracks:
// - Query success/failure rates
// - Mutation completion times
// - Cache hit/miss ratios
// - Error frequencies by type
// - User engagement patterns
```

---

## Testing Utilities

### 22. Test Utilities (`__tests__/`)

**Purpose**: Testing utilities and helpers for React Query components and hooks.

**Key Utilities**:
- `createTestQueryClient()`: Test query client setup
- `renderWithQueryClient(component)`: Render with query client
- `mockQueryData(queryKey, data)`: Mock query responses
- `waitForQuery(queryKey)`: Wait for query completion

**Testing Patterns**:
```typescript
// Test query hook
const { result } = renderHook(() => useUpcomingEventsQuery({ userId }), {
  wrapper: QueryClientWrapper
});

await waitFor(() => {
  expect(result.current.isSuccess).toBe(true);
});
```

---

## Examples

### 23. Example Components (`components/Examples/`)

**Purpose**: Comprehensive examples demonstrating all React Query features.

**Examples Available**:

1. **CrudMutationsExample** - Complete CRUD operations
2. **TypedMutationExample** - Type-safe mutations with states
3. **DevToolsExample** - DevTools integration
4. **TelemetryExample** - Telemetry and analytics
5. **SmoothUIExample** - Smooth UI transitions

**Each Example Demonstrates**:
- Real-world usage patterns
- Best practices implementation
- Error handling strategies
- Performance optimization techniques
- Testing approaches

---

## Integration Points

### Query Client Provider Setup

```typescript
// app/_layout.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/utils/queryClient';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  );
}
```

### Hook Usage Patterns

```typescript
// Component using multiple hooks
const EventListScreen = () => {
  const { events, hasNextPage, fetchNextPage } = useInfiniteUpcomingEventsQuery({
    userId,
    pageSize: 10,
    enableSmoothTransitions: true
  });
  
  const { createEvent, updateEvent, deleteEvent } = useEventCrudMutations({
    userId,
    enableOptimisticUpdates: true
  });
  
  // Component implementation...
};
```

### Error Boundary Integration

```typescript
// Wrap components with error boundaries
<ErrorBoundary fallback={QueryErrorFallback}>
  <EventListScreen />
</ErrorBoundary>
```

---

## Performance Considerations

1. **Query Key Design**: Use hierarchical keys for efficient invalidation
2. **Cache Management**: Implement appropriate GC and stale times
3. **Infinite Queries**: Use virtual scrolling for large lists
4. **Optimistic Updates**: Balance UX with data consistency
5. **Background Refetching**: Configure based on data volatility
6. **Memory Management**: Monitor cache size and implement cleanup

---

## Best Practices

1. **Type Safety**: Use TypeScript for all query and mutation functions
2. **Error Handling**: Implement comprehensive error boundaries
3. **Testing**: Test query hooks with proper mocking
4. **Performance**: Monitor query performance and optimize
5. **Offline Support**: Implement offline-first patterns where needed
6. **Documentation**: Document custom hooks and complex logic

---

## Migration Notes

- This implementation maintains backward compatibility where possible
- Gradual migration path allows incremental adoption
- Legacy query patterns can coexist during transition
- Performance improvements are immediate upon adoption

---

*This documentation covers all modules implemented in the TanStack React Query migration. Each module is designed to work together as part of a cohesive data management system while allowing for independent usage and testing.*