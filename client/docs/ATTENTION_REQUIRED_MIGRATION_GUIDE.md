# Attention Required Events - TanStack Migration Guide

This guide documents the migration of the AttentionRequired component and its associated stack page from legacy hooks to TanStack React Query.

## 📋 Overview

The migration replaces manual state management with TanStack React Query for both:
- `AttentionRequired.tsx` (Home screen component)
- `attention-required.tsx` (Stack page)

## 🚀 What Was Migrated

### Components Created
1. `useAttentionRequiredQuery.ts` - New TanStack query hook
2. `AttentionRequired.v2.tsx` - Migrated component
3. `attention-required.v2.tsx` - Migrated stack page
4. `AttentionRequiredMigration.tsx` - A/B testing wrapper for component
5. `attention-required-migration.tsx` - A/B testing wrapper for stack page

### Features Improved
- ✅ Automatic background refetching
- ✅ Better error handling with retry
- ✅ Built-in loading states
- ✅ Cache management
- ✅ Optimistic updates support
- ✅ Smooth UI transitions
- ✅ DevTools integration

## 📊 Performance Improvements

### Code Reduction
- **Home Component**: ~40% less code (complex state management removed)
- **Stack Page**: ~50% less code (manual data fetching removed)
- **Hook**: Completely replaced with declarative TanStack approach

### Memory & Performance
- Automatic cache management
- Better memory cleanup
- Reduced re-renders through stable query keys
- Background refetching without blocking UI

## 🔧 Migration Steps

### Step 1: Hook Migration

**Before (Legacy)**:
```typescript
const { 
  fetchAttentionRequiredEvents, 
  loading, 
  isFirstFetch, 
  error, 
  clearCache, 
  attentionEventsList 
} = useGetAttentionRequiredEvents();
```

**After (TanStack)**:
```typescript
const { 
  refetch: fetchAttentionRequiredEvents,
  isLoading: loading, 
  isFirstFetch, 
  error,
  invalidateAttentionRequired: clearCache,
  data: attentionEventsList
} = useAttentionRequiredQuery({ 
  fromHomeScreen: true,
  displayMode: 'homeScreen',
  limit: 3
});
```

### Step 2: Component State Management

**Removed (Legacy)**:
```typescript
const [localEventsList, setLocalEventsList] = useState<Event[]>(initialEvents || []);
const [loadingResponses, setLoadingResponses] = useState<{ [key: string]: boolean }>({});

const fetchEvents = React.useCallback(async (forceRefresh: boolean = false) => {
  // Complex manual fetching logic
}, [fetchAttentionRequiredEvents, onFinishRefresh]);

useFocusEffect(
  React.useCallback(() => {
    // Complex focus effect logic
  }, [refreshing, fetchEvents, initialEvents])
);
```

**Added (TanStack)**:
```typescript
const {
  data: eventsData,
  isLoading,
  isError,
  error,
  isFetching,
  refetch,
  isFirstFetch,
  isTransitioning
} = useAttentionRequiredQuery({
  fromHomeScreen: !initialEvents,
  displayMode: 'homeScreen',
  limit: initialEvents ? undefined : 3,
  onFinishRefresh,
  contextRefreshing,
  enableSmoothTransitions: true,
  usePlaceholderData: true,
  enabled: !initialEvents
});
```

### Step 3: Error Handling Enhancement

**Before**: Basic error logging
**After**: Enhanced error UI with retry functionality

```typescript
{isError && (
  <View style={{ /* error container styles */ }}>
    <ThemedText style={{ color: '#ff6b6b' }}>
      Unable to load attention required events
    </ThemedText>
    <ThemedText style={{ opacity: 0.8 }}>
      {error?.message || 'Something went wrong...'}
    </ThemedText>
    <TouchableOpacity onPress={() => refetch()}>
      <ThemedText style={{ color: '#fff' }}>Try Again</ThemedText>
    </TouchableOpacity>
  </View>
)}
```

## 🎯 Key Architectural Changes

### 1. Query Key Strategy
```typescript
// Stable query key prevents unnecessary re-renders
const stableQueryKey = queryKeys.attentionRequiredEvents(userId || '', fromHomeScreen);
```

### 2. Cache Management
```typescript
// Automatic cache invalidation on context refresh
useEffect(() => {
  if (contextRefreshing && userId) {
    queryClient.invalidateQueries({ queryKey: stableQueryKey });
  }
}, [contextRefreshing, queryClient, stableQueryKey, userId]);
```

### 3. Smart Data Selection
```typescript
// Only transform data when needed, preserve Event interface for homeScreen
select: enableSmoothTransitions && displayMode !== 'homeScreen' ? selectData : undefined,
```

### 4. Placeholder Data
```typescript
// Smooth loading states
placeholderData: usePlaceholderData ? 
  createPlaceholderData.attentionRequired() : 
  (keepPreviousDataOption ? (prev: any) => prev : undefined),
```

## 🧪 Testing Strategy

### A/B Testing Components

**Component Level**:
```typescript
<AttentionRequiredMigration
  version={useFeatureFlag('attention-required-v2') ? 'v2' : 'legacy'}
  refreshing={refreshing}
  onFinishRefresh={onFinishRefresh}
/>
```

**Stack Page Level**:
```typescript
// Navigate to migration page
router.push('/(auth)/attention-required-migration?version=v2');
```

**Side-by-Side Comparison**:
```typescript
<AttentionRequiredMigration
  version="compare"
  refreshing={refreshing}
  onFinishRefresh={onFinishRefresh}
/>
```

### Performance Monitoring

The migration wrappers include built-in performance monitoring:
- Render time tracking
- Error count monitoring
- Cache hit/miss metrics
- Loading state duration

## 📈 Usage Patterns

### Home Screen Integration
```typescript
// Use initialEvents when provided, otherwise fetch from API
const {
  data: eventsData,
  // ... other states
} = useAttentionRequiredQuery({
  fromHomeScreen: !initialEvents,
  displayMode: 'homeScreen', 
  limit: initialEvents ? undefined : 3,
  enabled: !initialEvents // Only fetch if no initialEvents
});

const events = (initialEvents || eventsData) as Event[];
```

### Stack Page Integration
```typescript
// Fetch all events for stack page
const {
  data: attentionEvents = [],
  // ... other states
} = useAttentionRequiredQuery({
  fromHomeScreen: false, // Fetch all events
  displayMode: 'homeScreen', // Keep original Event interface
  enableSmoothTransitions: true,
  usePlaceholderData: true
});
```

## 🔄 Deployment Strategy

### Phase 1: Parallel Development
- ✅ Create v2 components alongside legacy
- ✅ Build migration wrappers for testing
- ✅ Add feature flags for gradual rollout

### Phase 2: Testing & Validation
- [ ] Deploy migration components to staging
- [ ] A/B test with beta users
- [ ] Monitor performance metrics
- [ ] Validate functionality parity

### Phase 3: Gradual Rollout
- [ ] Enable v2 for 10% of users
- [ ] Monitor error rates and performance
- [ ] Gradually increase to 50%, then 100%
- [ ] Remove legacy code after successful migration

### Phase 4: Cleanup
- [ ] Remove legacy components
- [ ] Remove migration wrappers
- [ ] Update all imports to use v2 directly
- [ ] Update documentation

## 🚨 Rollback Strategy

### Immediate Rollback
```typescript
// Change feature flag to revert to legacy
<AttentionRequiredMigration version="legacy" />
```

### URL-Based Rollback
```typescript
// Use URL params for quick rollback
router.push('/(auth)/attention-required-migration?version=legacy');
```

## 🐛 Common Issues & Solutions

### 1. Type Errors with Event Interface
**Issue**: Event type mismatches when using select transformations
**Solution**: Use `displayMode: 'homeScreen'` to bypass select transformations

### 2. Conditional Hook Errors
**Issue**: "Rendered more hooks than during the previous render"
**Solution**: Always provide select function, return original data when not needed

### 3. Cache Invalidation
**Issue**: Stale data after event responses
**Solution**: Use proper cache update methods and invalidation strategies

## 📚 Related Documentation

- [TanStack Modules Reference](./TANSTACK_MODULES_REFERENCE.md)
- [TanStack Migration Guide](./TANSTACK_MIGRATION_GUIDE.md)
- [UpcomingEvents Migration Steps](./UpcomingEvents_MIGRATION_STEPS.md)
- [AbortController Fix](./AbortController_Fix.md)

## ✅ Migration Checklist

### Pre-Migration
- [x] Analyze legacy component structure
- [x] Create TanStack query hook
- [x] Create v2 components
- [x] Create migration wrappers
- [x] Add placeholder data support
- [x] Document migration steps

### Migration Phase
- [ ] Deploy to staging environment
- [ ] Enable A/B testing infrastructure
- [ ] Monitor performance metrics
- [ ] Test error scenarios
- [ ] Validate all user flows

### Post-Migration
- [ ] Monitor production metrics
- [ ] Collect user feedback
- [ ] Clean up legacy code
- [ ] Update team documentation
- [ ] Share lessons learned

---

**Migration Status**: ✅ Ready for Testing
**Next Steps**: Deploy to staging and begin A/B testing