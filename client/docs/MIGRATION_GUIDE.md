# Migration Guide: LRU Cache to TanStack React Query

## Overview

This guide explains how to migrate from our custom LRU cache system to TanStack React Query for better performance, caching, and developer experience.

## 🚀 What's Been Set Up

### 1. Core Infrastructure
- ✅ TanStack React Query installed
- ✅ QueryClient configured with optimal defaults
- ✅ QueryClientProvider added to app root
- ✅ React Query DevTools enabled for development
- ✅ Centralized query keys factory
- ✅ Base query functions with error handling

### 2. Query Configuration
- **Stale Time**: 2 minutes (matches LRU cache TTL)
- **Cache Time**: 10 minutes (memory retention)
- **Retry Logic**: Smart retry with exponential backoff
- **Background Refetch**: Enabled on window focus and network reconnect
- **DevTools**: Available in development mode

## 📋 Migration Steps

### Step 1: Replace Hook Import

**Before (LRU Cache):**
```typescript
import { useGetMyEvents } from '@/hooks/useGetMyEvents';
```

**After (React Query):**
```typescript
import { useUpcomingEventsQuery } from '@/hooks/useUpcomingEventsQuery';
```

### Step 2: Update Hook Usage

**Before:**
```typescript
const { 
  events, 
  loading, 
  isFirstFetch, 
  refreshEvents, 
  clearCache 
} = useGetMyEvents(true); // fromHomeScreen = true
```

**After:**
```typescript
const { 
  data: events, 
  isLoading: loading, 
  isFirstFetch, 
  refetch: refreshEvents,
  invalidateUpcomingEvents: clearCache
} = useUpcomingEventsQuery({ fromHomeScreen: true });
```

### Step 3: Update Component Logic

**Before (Manual Cache Management):**
```typescript
// Manual cache update after event status change
const handleEventResponse = async (eventId: string, response: string) => {
  await respondToInvitation(eventId, response);
  // Manually update cache
  clearCache();
  refreshEvents();
};
```

**After (Optimistic Updates):**
```typescript
// Optimistic update with automatic rollback on failure
const handleEventResponse = async (eventId: string, response: string) => {
  // Optimistically update the cache
  updateSingleEventInCache(eventId, { ...event, userStatus: response });
  
  try {
    await respondToInvitation(eventId, response);
    // React Query will automatically refetch to confirm the change
  } catch (error) {
    // React Query will automatically rollback the optimistic update
    console.error('Failed to respond to invitation:', error);
  }
};
```

## 🔄 Migration Examples

### Example 1: Home Screen Upcoming Events

**Before (`useGetMyEvents`):**
```typescript
const UpcomingEvents: React.FC = () => {
  const { events, loading, isFirstFetch, refreshEvents } = useGetMyEvents(true);
  
  const handleRefresh = () => {
    refreshEvents();
  };
  
  if (isFirstFetch && loading) {
    return <SkeletonLoader />;
  }
  
  return (
    <ScrollView onRefresh={handleRefresh} refreshing={loading}>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </ScrollView>
  );
};
```

**After (`useUpcomingEventsQuery`):**
```typescript
const UpcomingEvents: React.FC = () => {
  const { 
    data: events, 
    isLoading, 
    isFirstFetch, 
    refetch,
    isFetching 
  } = useUpcomingEventsQuery({ fromHomeScreen: true });
  
  const handleRefresh = () => {
    refetch();
  };
  
  if (isFirstFetch && isLoading) {
    return <SkeletonLoader />;
  }
  
  return (
    <ScrollView onRefresh={handleRefresh} refreshing={isFetching}>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </ScrollView>
  );
};
```

### Example 2: Nearby Events with Location

**Before (`useGetNearByEvents`):**
```typescript
const NearbyEvents: React.FC = () => {
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const { fetchNearByEventsPreview, loading } = useGetNearByEvents();
  
  const fetchEvents = useCallback(async () => {
    if (userLocation.lat && userLocation.lng) {
      const result = await fetchNearByEventsPreview(
        userLocation.lat, 
        userLocation.lng, 
        selectedDistance
      );
      setNearbyEvents(result.events);
    }
  }, [userLocation, selectedDistance]);
  
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  return (
    <View>
      {loading && <SkeletonLoader />}
      {nearbyEvents.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </View>
  );
};
```

**After (`useNearbyEventsQuery`):**
```typescript
const NearbyEvents: React.FC = () => {
  const { 
    data: nearbyEventsData, 
    isLoading, 
    isFirstFetch 
  } = useNearbyEventsQuery({
    lat: userLocation.lat,
    lng: userLocation.lng,
    distance: selectedDistance,
    enabled: Boolean(userLocation.lat && userLocation.lng)
  });
  
  const events = nearbyEventsData?.events || [];
  
  if (isFirstFetch && isLoading) {
    return <SkeletonLoader />;
  }
  
  return (
    <View>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </View>
  );
};
```

## 🎯 Key Benefits After Migration

### 1. Automatic Cache Management
- No more manual cache invalidation
- Automatic background refetching
- Smart cache TTL management
- Memory-efficient cleanup

### 2. Better User Experience
- Optimistic updates for instant feedback
- Background refetching keeps data fresh
- Better error handling with retry logic
- No more loading states for cached data

### 3. Developer Experience
- React Query DevTools for debugging
- Type-safe query keys
- Centralized query configuration
- Better error boundaries

### 4. Performance Improvements
- Reduced API calls with smart caching
- Parallel query execution
- Request deduplication
- Better memory usage

## 📊 Cache Invalidation Patterns

### Invalidate Single Query
```typescript
// Invalidate specific upcoming events query
queryClient.invalidateQueries({
  queryKey: queryKeys.upcomingEvents(userId, fromHomeScreen)
});
```

### Invalidate Related Queries
```typescript
// Invalidate all user-related queries
queryClient.invalidateQueries({
  queryKey: queryKeys.userEvents(userId)
});
```

### Update Cache Optimistically
```typescript
// Update cache immediately, then refetch to confirm
queryClient.setQueryData(
  queryKeys.upcomingEvents(userId, fromHomeScreen),
  (oldData: Event[] | undefined) => {
    if (!oldData) return oldData;
    return oldData.map(event => 
      event._id === eventId ? updatedEvent : event
    );
  }
);
```

## 🔧 Migration Checklist

### For Each Hook:
- [ ] Create new React Query hook
- [ ] Update import statements
- [ ] Replace hook usage in components
- [ ] Update loading state handling
- [ ] Replace manual cache management
- [ ] Add optimistic updates where appropriate
- [ ] Test functionality thoroughly
- [ ] Remove old hook when confirmed working

### For Components:
- [ ] Update loading state checks
- [ ] Replace manual refresh logic
- [ ] Update error handling
- [ ] Test pull-to-refresh behavior
- [ ] Verify skeleton loading states
- [ ] Test offline/online behavior

## 🧪 Testing Strategy

### 1. Component Testing
- Verify loading states work correctly
- Test error scenarios
- Confirm optimistic updates
- Validate cache invalidation

### 2. Integration Testing
- Test cross-component cache updates
- Verify background refetching
- Test network failure scenarios
- Confirm memory usage improvements

### 3. Performance Testing
- Monitor query performance with DevTools
- Check memory usage patterns
- Verify reduced API calls
- Test cache hit rates

## 📈 Monitoring & Debugging

### React Query DevTools
- Available in development mode
- Shows query status and cache state
- Visualizes query dependencies
- Helps debug cache issues

### Performance Monitoring
```typescript
// Monitor query performance
const { dataUpdatedAt, errorUpdatedAt, fetchStatus } = useUpcomingEventsQuery();

// Log cache statistics
console.log('Query cache stats:', {
  lastUpdated: dataUpdatedAt,
  fetchStatus,
  isStale: isStale
});
```

## 🚨 Common Pitfalls

### 1. Query Key Consistency
- Always use the query keys factory
- Don't construct query keys manually
- Keep query keys consistent across components

### 2. Loading State Management
- Use `isLoading` for initial load
- Use `isFetching` for refresh states
- Use `isFirstFetch` for skeleton loading

### 3. Error Handling
- Don't ignore error states
- Provide proper error boundaries
- Handle network failures gracefully

### 4. Cache Invalidation
- Don't over-invalidate queries
- Use specific query keys when possible
- Consider optimistic updates vs invalidation

## 🎉 Success Metrics

After migration, you should see:
- **Reduced API calls** (better caching)
- **Faster perceived performance** (optimistic updates)
- **Better error handling** (automatic retries)
- **Improved developer experience** (DevTools)
- **Cleaner code** (less manual cache management)

## 🆘 Getting Help

If you encounter issues during migration:
1. Check React Query DevTools
2. Review query key consistency
3. Verify error handling
4. Check network tab for API calls
5. Review cache invalidation patterns

The migration should be done incrementally, hook by hook, to avoid breaking existing functionality.