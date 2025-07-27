# TanStack React Query Migration Guide

This guide provides a comprehensive step-by-step approach to migrating your existing React application to use the new TanStack React Query implementation. The migration is designed to be gradual, allowing you to migrate components one by one without breaking existing functionality.

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Prerequisites](#prerequisites)
3. [Migration Phases](#migration-phases)
4. [Component-by-Component Migration](#component-by-component-migration)
5. [Data Flow Migration](#data-flow-migration)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Strategy](#rollback-strategy)
8. [Performance Monitoring](#performance-monitoring)
9. [Common Issues & Solutions](#common-issues--solutions)
10. [Best Practices](#best-practices)

## Migration Overview

The migration follows a **gradual adoption** strategy that allows you to:
- Migrate one component/feature at a time
- Maintain existing functionality during migration
- Test each migration step independently
- Rollback individual components if needed
- Monitor performance improvements incrementally

### Migration Benefits

✅ **Immediate Benefits**:
- Better error handling
- Automatic retry logic
- Built-in loading states
- Cache management
- Background refetching

✅ **Long-term Benefits**:
- Type safety improvements
- Performance optimization
- Offline support
- Developer experience enhancements
- Comprehensive testing utilities

## Prerequisites

Before starting the migration, ensure you have:

1. **TanStack React Query v5** installed and configured
2. **TypeScript** properly set up (if using TypeScript)
3. **Testing environment** configured
4. **Backup** of your current implementation
5. **Feature flags** system (recommended for gradual rollout)

### Installation Check

```bash
npm list @tanstack/react-query
# Should show v5.x.x

npm list @tanstack/react-query-devtools
# Should show v5.x.x (for development)
```

## Migration Phases

### Phase 1: Infrastructure Setup ✅
*Already completed in your project*

- [x] Query client configuration
- [x] Provider setup
- [x] Query keys structure
- [x] Error handling system
- [x] DevTools integration

### Phase 2: Core Utilities Migration
*Next recommended phase*

**Components to migrate first** (in order):
1. [API calls and data fetching](#1-api-calls-migration)
2. [Basic list components](#2-basic-list-components)
3. [Detail/view components](#3-detailview-components)
4. [Form/mutation components](#4-formmutation-components)

### Phase 3: Advanced Features Migration
*After core utilities are stable*

1. [Infinite scrolling components](#5-infinite-scrolling-migration)
2. [Real-time data components](#6-real-time-data-migration)
3. [Offline-capable components](#7-offline-capable-components)

### Phase 4: Optimization & Polish
*Final phase*

1. [Performance optimization](#8-performance-optimization)
2. [Advanced caching strategies](#9-advanced-caching)
3. [Telemetry integration](#10-telemetry-integration)

## Component-by-Component Migration

### 1. API Calls Migration

**Before (Legacy)**:
```typescript
// Legacy API call
const fetchEvents = async () => {
  setLoading(true);
  try {
    const response = await api.get('/events');
    setEvents(response.data);
    setError(null);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchEvents();
}, []);
```

**After (TanStack)**:
```typescript
// TanStack Query hook
import { useUpcomingEventsQuery } from '@/hooks/useUpcomingEventsQuery';

const { 
  data: events, 
  isLoading, 
  error, 
  refetch 
} = useUpcomingEventsQuery({ 
  userId,
  displayMode: 'full'
});
```

**Migration Steps**:

1. **Identify the API call pattern**:
   ```typescript
   // Find patterns like:
   const [data, setData] = useState();
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState();
   
   useEffect(() => {
     // API call logic
   }, [dependencies]);
   ```

2. **Create or use existing query hook**:
   ```typescript
   // Check if hook exists in /hooks/
   // If not, create using the pattern:
   
   export const useMyDataQuery = (params) => {
     return useQuery({
       queryKey: queryKeys.myData(params),
       queryFn: () => api.get('/my-data', { params }),
       enabled: !!params.requiredField
     });
   };
   ```

3. **Replace the component logic**:
   ```typescript
   // Remove manual state management
   // - const [data, setData] = useState()
   // - const [loading, setLoading] = useState()
   // - const [error, setError] = useState()
   // - useEffect with API call
   
   // Add query hook
   const { data, isLoading, error } = useMyDataQuery(params);
   ```

4. **Update component render logic**:
   ```typescript
   // Before: loading ? <Spinner /> : <Content />
   // After: isLoading ? <Spinner /> : <Content />
   
   // Before: error ? <ErrorMsg /> : null
   // After: error ? <ErrorMsg error={error} /> : null
   ```

**Testing Checklist**:
- [ ] Data loads correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Component re-renders appropriately
- [ ] No memory leaks

---

### 2. Basic List Components

**Example**: Event list, user list, notification list

**Before (Legacy)**:
```typescript
const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchEvents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => fetchEvents(true);
  
  return (
    <FlatList 
      data={events}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
};
```

**After (TanStack)**:
```typescript
const EventList = () => {
  const { 
    data: events = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useUpcomingEventsQuery({
    userId,
    displayMode: 'list'
  });
  
  return (
    <FlatList 
      data={events}
      refreshing={isFetching}
      onRefresh={refetch}
    />
  );
};
```

**Migration Steps**:

1. **Identify list patterns**:
   ```typescript
   // Look for components with:
   // - Array state (useState([]))
   // - Loading state
   // - Refresh functionality
   // - FlatList or similar list component
   ```

2. **Choose appropriate query hook**:
   ```typescript
   // For simple lists:
   useUpcomingEventsQuery()
   
   // For infinite scrolling:
   useInfiniteUpcomingEventsQuery()
   
   // For real-time lists:
   useSmoothUpcomingEvents()
   ```

3. **Remove manual state management**:
   ```typescript
   // Remove:
   // - useState for data array
   // - useState for loading/refreshing
   // - useEffect for initial fetch
   // - Manual refresh functions
   ```

4. **Update list component props**:
   ```typescript
   <FlatList 
     data={events}
     refreshing={isFetching}      // Instead of manual refreshing state
     onRefresh={refetch}          // Instead of manual refresh function
   />
   ```

**Testing Checklist**:
- [ ] List renders correctly
- [ ] Pull-to-refresh works
- [ ] Loading indicators work
- [ ] Empty states work
- [ ] Error states work

---

### 3. Detail/View Components

**Example**: Event details, user profile, single item views

**Before (Legacy)**:
```typescript
const EventDetails = ({ eventId }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get(`/events/${eventId}`);
        setEvent(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);
  
  if (loading) return <Skeleton />;
  if (!event) return <NotFound />;
  
  return <EventDetailsView event={event} />;
};
```

**After (TanStack)**:
```typescript
const EventDetails = ({ eventId }) => {
  const { 
    data: event, 
    isLoading, 
    error 
  } = useEventDetailsQuery(eventId);
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorView error={error} />;
  if (!event) return <NotFound />;
  
  return <EventDetailsView event={event} />;
};
```

**Migration Steps**:

1. **Create detail query hook** (if doesn't exist):
   ```typescript
   export const useEventDetailsQuery = (eventId: string) => {
     return useQuery({
       queryKey: queryKeys.eventById(eventId),
       queryFn: () => api.get(`/events/${eventId}`).then(res => res.data),
       enabled: !!eventId
     });
   };
   ```

2. **Replace component logic**:
   ```typescript
   // Remove manual state and effects
   // Add query hook call
   // Update conditional rendering
   ```

3. **Add proper error handling**:
   ```typescript
   if (error) {
     return <ErrorView 
       error={error} 
       onRetry={() => refetch()} 
     />;
   }
   ```

**Testing Checklist**:
- [ ] Details load correctly
- [ ] Loading state shows
- [ ] Error handling works
- [ ] Not found state works
- [ ] Data updates when ID changes

---

### 4. Form/Mutation Components

**Example**: Create event, update profile, delete item

**Before (Legacy)**:
```typescript
const CreateEventForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    
    try {
      await api.post('/events', formData);
      // Manual cache invalidation
      // Navigate or show success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {error && <ErrorMessage error={error} />}
      <Button loading={loading} />
    </Form>
  );
};
```

**After (TanStack)**:
```typescript
const CreateEventForm = () => {
  const createEvent = useCreateEventMutation();
  
  const handleSubmit = async (formData) => {
    try {
      await createEvent.mutateAsync(formData);
      // Automatic cache invalidation
      // Navigate or show success
    } catch (error) {
      // Error automatically handled by mutation
    }
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {createEvent.isError && (
        <ErrorMessage error={createEvent.error} />
      )}
      <Button loading={createEvent.isPending} />
    </Form>
  );
};
```

**Migration Steps**:

1. **Choose appropriate mutation hook**:
   ```typescript
   // For simple mutations:
   useCreateEventMutation()
   
   // For CRUD operations:
   const { createEvent, updateEvent, deleteEvent } = useEventCrudMutations();
   
   // For typed mutations:
   const mutation = useTypedEventMutation();
   ```

2. **Replace form submission logic**:
   ```typescript
   // Instead of manual API calls:
   const mutation = useCreateEventMutation();
   
   const handleSubmit = async (data) => {
     await mutation.mutateAsync(data);
   };
   ```

3. **Update form state handling**:
   ```typescript
   // Loading: mutation.isPending
   // Error: mutation.error
   // Success: mutation.isSuccess
   ```

4. **Remove manual cache management**:
   ```typescript
   // TanStack handles cache invalidation automatically
   // Remove manual cache clearing/updating
   ```

**Testing Checklist**:
- [ ] Form submits correctly
- [ ] Loading states work
- [ ] Error handling works
- [ ] Success states work
- [ ] Cache updates correctly

---

### 5. Infinite Scrolling Migration

**Before (Legacy)**:
```typescript
const InfiniteEventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/events?page=${page}`);
      setEvents(prev => [...prev, ...response.data.events]);
      setHasMore(response.data.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <FlatList
      data={events}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
};
```

**After (TanStack)**:
```typescript
const InfiniteEventList = () => {
  const {
    events,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useInfiniteUpcomingEventsQuery({
    userId,
    pageSize: 10
  });
  
  return (
    <FlatList
      data={events}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
    />
  );
};
```

**Migration Steps**:

1. **Replace manual pagination logic**:
   ```typescript
   // Remove:
   // - page state
   // - hasMore state  
   // - loadMore function
   // - events array state
   
   // Add:
   const { events, hasNextPage, fetchNextPage } = useInfiniteQuery(...);
   ```

2. **Update FlatList props**:
   ```typescript
   <FlatList
     data={events}                    // Flattened array from hook
     onEndReached={fetchNextPage}     // Simplified function call
   />
   ```

**Testing Checklist**:
- [ ] Initial load works
- [ ] Infinite scrolling works
- [ ] Loading indicators work
- [ ] End of list detection works
- [ ] Pull-to-refresh works

---

### 6. Real-time Data Migration

**Before (Legacy)**:
```typescript
const RealTimeEvents = () => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await api.get('/events');
      setEvents(response.data);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Component implementation
};
```

**After (TanStack)**:
```typescript
const RealTimeEvents = () => {
  const { data: events } = useUpcomingEventsQuery({
    userId,
    displayMode: 'realtime',
    refetchInterval: 5000,        // Auto-refetch every 5 seconds
    refetchIntervalInBackground: true
  });
  
  // Component implementation
};
```

**Migration Steps**:

1. **Remove manual intervals**:
   ```typescript
   // Remove setInterval/setTimeout logic
   // Remove manual polling functions
   ```

2. **Add refetch options to query**:
   ```typescript
   useQuery({
     // ... other options
     refetchInterval: 5000,
     refetchIntervalInBackground: true,
     refetchOnWindowFocus: true
   });
   ```

**Testing Checklist**:
- [ ] Data refreshes automatically
- [ ] Polling continues in background
- [ ] Polling stops when component unmounts
- [ ] Manual refresh still works

---

### 7. Offline-Capable Components

**Migration for components that need offline support**:

**After (TanStack with Offline)**:
```typescript
const OfflineCapableForm = () => {
  const createEvent = useCreateEventMutation({
    // Enable offline queuing
    useOfflineQueue: true
  });
  
  const handleSubmit = (data) => {
    // Will queue if offline, execute when online
    createEvent.mutate(data);
  };
  
  return (
    <Form onSubmit={handleSubmit}>
      {!navigator.onLine && (
        <OfflineIndicator message="Will sync when online" />
      )}
    </Form>
  );
};
```

**Migration Steps**:

1. **Add offline queue to mutations**:
   ```typescript
   const mutation = useCreateEventMutation({
     useOfflineQueue: true
   });
   ```

2. **Add offline indicators**:
   ```typescript
   {!navigator.onLine && <OfflineIndicator />}
   ```

---

## Data Flow Migration

### Legacy Data Flow
```
Component → Manual API Call → Manual State Update → Manual Error Handling → Manual Cache Management
```

### New TanStack Data Flow
```
Component → Query/Mutation Hook → Automatic State Management → Automatic Error Handling → Automatic Cache Management
```

### Key Differences

| Aspect | Legacy | TanStack |
|--------|--------|----------|
| **State Management** | Manual useState | Automatic |
| **Loading States** | Manual boolean states | Built-in isLoading |
| **Error Handling** | Manual try/catch | Built-in error states |
| **Cache Management** | Manual or none | Automatic |
| **Refetching** | Manual functions | Built-in refetch |
| **Optimistic Updates** | Manual implementation | Built-in support |
| **Offline Support** | Custom implementation | Built-in queue |

## Testing Strategy

### 1. Unit Tests

**Before Migration**:
```typescript
// Test manual API calls and state management
it('should fetch and set events', async () => {
  const mockApi = jest.spyOn(api, 'get');
  mockApi.mockResolvedValue({ data: mockEvents });
  
  render(<EventList />);
  
  await waitFor(() => {
    expect(screen.getByText('Event 1')).toBeInTheDocument();
  });
});
```

**After Migration**:
```typescript
// Test with React Query testing utilities
it('should fetch and display events', async () => {
  const queryClient = createTestQueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <EventList />
    </QueryClientProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Event 1')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Test the migration in stages:

1. **Side-by-side testing**: Run both old and new components
2. **Feature flag testing**: Toggle between implementations
3. **A/B testing**: Compare performance and reliability

### 3. E2E Tests

Ensure end-to-end workflows still work:
- User can create, read, update, delete events
- Navigation flows work correctly
- Error scenarios are handled properly

## Rollback Strategy

### 1. Feature Flags

Implement feature flags for each migrated component:

```typescript
const useFeatureFlag = (flag: string) => {
  return process.env[`FEATURE_${flag}`] === 'true';
};

const EventList = () => {
  const useTanStack = useFeatureFlag('TANSTACK_EVENT_LIST');
  
  if (useTanStack) {
    return <TanStackEventList />;
  }
  
  return <LegacyEventList />;
};
```

### 2. Component Versioning

Keep both versions available:

```typescript
// components/EventList/index.ts
export { default } from './EventList.v2'; // TanStack version
// export { default } from './EventList.v1'; // Legacy version
```

### 3. Gradual Rollout

Use percentage-based rollout:

```typescript
const shouldUseTanStack = () => {
  const userId = getCurrentUserId();
  const hash = hashUserId(userId);
  return hash % 100 < 25; // 25% rollout
};
```

## Performance Monitoring

### 1. Metrics to Track

**Before Migration**:
- API call frequency
- Component render times
- Memory usage
- Error rates
- User perceived performance

**After Migration**:
- Cache hit rates
- Background refetch frequency
- Reduced API calls
- Improved render performance
- Better error recovery

### 2. Monitoring Tools

Set up monitoring for:

```typescript
// Performance tracking
import { trackQueryPerformance } from '@/utils/telemetrySetup';

const EventList = () => {
  const startTime = performance.now();
  
  const { data, isLoading } = useUpcomingEventsQuery({
    userId,
    onSuccess: () => {
      trackQueryPerformance('event_list', performance.now() - startTime);
    }
  });
  
  // Component implementation
};
```

### 3. Key Performance Indicators

- **Query Success Rate**: Should increase
- **Average Response Time**: Should decrease
- **Cache Hit Ratio**: Should increase
- **Error Recovery Time**: Should decrease
- **User Engagement**: Should improve

## Common Issues & Solutions

### 1. Query Key Mismatches

**Problem**: Queries not invalidating correctly

**Solution**: Use consistent query keys
```typescript
// Wrong
queryKey: ['events', userId]

// Right  
queryKey: queryKeys.upcomingEvents(userId)
```

### 2. Memory Leaks

**Problem**: Components not cleaning up properly

**Solution**: Proper cleanup in useEffect
```typescript
useEffect(() => {
  const subscription = queryClient.getQueryCache().subscribe(callback);
  
  return () => subscription(); // Cleanup
}, []);
```

### 3. Infinite Rerenders

**Problem**: Query dependencies causing rerenders

**Solution**: Stabilize dependencies
```typescript
// Wrong
const options = { userId, filter };

// Right
const options = useMemo(() => ({ userId, filter }), [userId, filter]);
```

### 4. Stale Data Issues

**Problem**: Data not updating when expected

**Solution**: Configure appropriate stale times
```typescript
useQuery({
  queryKey: queryKeys.eventById(eventId),
  queryFn: fetchEvent,
  staleTime: 30 * 1000 // 30 seconds
});
```

### 5. Error Boundary Issues

**Problem**: Errors not caught properly

**Solution**: Wrap components with error boundaries
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <EventList />
</ErrorBoundary>
```

## Best Practices

### 1. Migration Order

✅ **Recommended Order**:
1. Read-only components (lists, details)
2. Simple forms (create, update)
3. Complex forms (multi-step, file uploads)
4. Real-time components
5. Offline-capable components

### 2. Query Key Strategy

```typescript
// Good: Hierarchical structure
const queryKeys = {
  events: ['events'],
  eventList: (filters) => [...queryKeys.events, 'list', filters],
  eventDetail: (id) => [...queryKeys.events, 'detail', id]
};
```

### 3. Error Handling

```typescript
// Good: Consistent error handling
const { data, error, isError } = useQuery({
  queryKey: queryKeys.events,
  queryFn: fetchEvents,
  throwOnError: false // Handle errors in component
});

if (isError) {
  return <ErrorBoundary error={error} />;
}
```

### 4. Type Safety

```typescript
// Good: Type-safe query functions
export const useEventsQuery = (params: EventsQueryParams) => {
  return useQuery<Event[], ApiError>({
    queryKey: queryKeys.eventList(params),
    queryFn: () => fetchEvents(params)
  });
};
```

### 5. Testing

```typescript
// Good: Test with proper setup
const renderWithQueryClient = (component: ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current implementation
- [ ] Set up feature flags
- [ ] Create test environment
- [ ] Document current behavior
- [ ] Set up monitoring

### During Migration
- [ ] Start with simple read-only components
- [ ] Test each component thoroughly
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Document any issues

### Post-Migration
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Train team on new patterns
- [ ] Monitor long-term metrics
- [ ] Plan next migration phase

---

## Summary

This migration guide provides a comprehensive approach to gradually adopting TanStack React Query. The key to successful migration is:

1. **Start small** - Begin with simple components
2. **Test thoroughly** - Ensure each step works correctly
3. **Monitor closely** - Track performance and errors
4. **Have rollback plans** - Be prepared to revert if needed
5. **Document everything** - Help your team understand the changes

Remember that migration is a process, not a destination. Take your time, test thoroughly, and enjoy the improved developer experience and performance that TanStack React Query provides!

*For detailed implementation examples, refer to the components in the `/components/Examples/` directory.*