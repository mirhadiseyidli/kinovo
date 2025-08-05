# TanStack Query Migration Plan

## Overview

This document provides a comprehensive, step-by-step migration plan to move all components and screens from the old TanStack Query implementation to the new simplified hooks. We'll use the `.new` naming convention during migration to allow gradual rollout without breaking the app.

## Migration Strategy: Gradual Replacement

### Core Principles
- ✅ **No downtime** - App continues working during migration
- ✅ **Incremental testing** - Test each change before proceeding  
- ✅ **Easy rollback** - Keep old files until migration is complete
- ✅ **Component-by-component** - Replace usage patterns systematically

## Phase 1: Foundation Setup (Week 1)

### Day 1-2: Test New Infrastructure

#### Step 1: Test Single Hook
Pick one simple component that uses `useEventByIdQuery`:

```typescript
// Example: app/(auth)/viewEvent/[event_id].tsx
// BEFORE:
import { useEventByIdQuery } from '@/hooks/useEventByIdQuery';
const { event, loading, error } = useEventByIdQuery(event_id);

// AFTER (test with .new):
import { useEventByIdQuery } from '@/hooks/useEventByIdQuery.new';
const { data: event, isLoading: loading, error } = useEventByIdQuery(event_id);
```

**Validation Checklist:**
- [ ] Event loads correctly
- [ ] User relationship data is present (userStatus, isUserAttending, etc.)
- [ ] Loading states work
- [ ] Error handling works
- [ ] Button rendering logic works (based on user relationships)

#### Step 2: Test Mutation Hook
Pick one component that performs event mutations:

```typescript
// Example: components that join/leave events
// BEFORE:
import { useEventMutations } from '@/hooks/useEventMutations';
const { respondToInvitation, loading } = useEventMutations();

// AFTER (test with .new):
import { useEventResponseMutation } from '@/hooks/useEventMutations.new';
const respondMutation = useEventResponseMutation();
const { mutate: respondToInvitation, isPending: loading } = respondMutation;
```

**Validation Checklist:**
- [ ] Mutation executes successfully
- [ ] UI updates immediately after mutation
- [ ] Event cache updates automatically
- [ ] Related lists update without refetch
- [ ] Error handling displays properly

### Day 3-5: Core Infrastructure Replacement

Once testing passes, replace core files:

```bash
# Backup old files
cp client/utils/queryKeys.ts client/utils/queryKeys.backup.ts
cp client/utils/queryFunctions.ts client/utils/queryFunctions.backup.ts

# Replace with new versions
mv client/utils/queryKeys.new.ts client/utils/queryKeys.ts
mv client/utils/queryFunctions.new.ts client/utils/queryFunctions.ts

# Remove over-engineered utilities (optional - keep if needed)
# mv client/utils/stableQueryKey.ts client/utils/stableQueryKey.old.ts
```

**Post-Replacement Testing:**
- [ ] Test the components you already converted
- [ ] Run the app and check for import errors
- [ ] Fix any TypeScript errors
- [ ] Ensure no regressions in tested components

## Phase 2: Event-Related Components (Week 2)

### Component Categories by Hook Usage

#### Category A: Event Detail Components (High Priority)
**Hook Used:** `useEventByIdQuery`

**Components to Update:**
```typescript
// app/(auth)/viewEvent/[event_id].tsx
// components/EventDetailModal.tsx  
// components/EventCard.tsx (if using detail query)
// components/EventPreview.tsx
```

**Migration Pattern:**
```typescript
// OLD:
const { event, loading, error, refetch } = useEventByIdQuery(eventId);

// NEW:
const { data: event, isLoading: loading, error, refetch } = useEventByIdQuery(eventId);

// UI code stays the same - all user relationship data preserved
if (event?.isUserCreator) { /* creator UI */ }
if (event?.userStatus === 'accepted') { /* attendee UI */ }
```

#### Category B: Event List Components (High Priority)
**Hooks Used:** `useUpcomingEventsQuery`, `usePastEventsQuery`, `useAttentionRequiredQuery`

**Components to Update:**
```typescript
// app/(auth)/(tabs)/home/index.tsx - Upcoming events
// app/(auth)/(tabs)/calendar/index.tsx - Calendar events  
// app/(auth)/pastEvents/index.tsx - Past events
// components/EventsList.tsx
// components/UpcomingEventsList.tsx
// components/AttentionRequiredList.tsx
```

**Migration Pattern:**
```typescript
// OLD:
const { events, loading, error, refetch } = useUpcomingEventsQuery(fromHomeScreen);

// NEW:
const { data: events, isLoading: loading, error, refetch } = useUpcomingEventsQuery(fromHomeScreen);

// Handle undefined data safely
const eventsList = events || [];
```

#### Category C: Event Mutation Components (Critical Priority)
**Hooks Used:** `useEventMutations`, `useEventCrud`

**Components to Update:**
```typescript
// components/EventActionButtons.tsx
// components/JoinEventButton.tsx
// components/ResponseButtons.tsx
// components/EventInvitationCard.tsx
// app/(auth)/createEvent/index.tsx
// app/(auth)/editEvent/[event_id].tsx
```

**Migration Pattern:**
```typescript
// OLD:
const { respondToInvitation, joinEvent, loading } = useEventMutations();

// NEW - Option 1 (Individual mutations):
const respondMutation = useEventResponseMutation();
const joinMutation = useJoinEventMutation();
const { mutate: respondToInvitation, isPending: respondLoading } = respondMutation;
const { mutate: joinEvent, isPending: joinLoading } = joinMutation;
const loading = respondLoading || joinLoading;

// NEW - Option 2 (Combined hook - create wrapper):
const useEventMutationsCompat = () => {
  const respondMutation = useEventResponseMutation();
  const joinMutation = useJoinEventMutation();
  
  return {
    respondToInvitation: respondMutation.mutate,
    joinEvent: joinMutation.mutate,
    loading: respondMutation.isPending || joinMutation.isPending,
    error: respondMutation.error || joinMutation.error,
  };
};
```

### Daily Migration Schedule

#### Day 1: Event Detail Components
- [ ] Migrate `app/(auth)/viewEvent/[event_id].tsx`
- [ ] Test event loading, user relationships, button rendering
- [ ] Migrate `components/EventDetailModal.tsx`
- [ ] Test modal functionality

#### Day 2: Home Screen & Upcoming Events  
- [ ] Migrate `app/(auth)/(tabs)/home/index.tsx`
- [ ] Test upcoming events list loading
- [ ] Test pull-to-refresh functionality
- [ ] Migrate `components/UpcomingEventsList.tsx`

#### Day 3: Event Action Components
- [ ] Migrate `components/EventActionButtons.tsx`
- [ ] Test join/leave/respond functionality
- [ ] Verify cache updates work automatically
- [ ] Test error handling

#### Day 4: Past Events & Calendar
- [ ] Migrate `app/(auth)/pastEvents/index.tsx`
- [ ] Test pagination if using infinite queries
- [ ] Migrate calendar-related components
- [ ] Test calendar month navigation

#### Day 5: Create/Edit Event Components
- [ ] Migrate `app/(auth)/createEvent/index.tsx`
- [ ] Test event creation flow
- [ ] Migrate `app/(auth)/editEvent/[event_id].tsx`
- [ ] Test event editing and cache updates

## Phase 3: Discovery & Social Components (Week 3)

#### Category D: Discovery Components
**Hooks Used:** `useNearbyEventsQuery`, `useSearchQueries`

**Components to Update:**
```typescript
// app/(auth)/(tabs)/discover/index.tsx
// app/(auth)/nearbyEvents/index.tsx  
// app/(auth)/search/index.tsx
// components/NearbyEventsList.tsx
// components/SearchResults.tsx
// components/DiscoveryCard.tsx
```

**Migration Pattern:**
```typescript
// OLD:
const { events, loading, error } = useNearbyEventsQuery(lat, lng, distance);

// NEW:
const { data: events, isLoading: loading, error } = useNearbyEventsQuery(lat, lng, distance);
```

#### Category E: User & Social Components  
**Hooks Used:** `useUserQueries`, `useFriendMutations`, `useNotificationQueries`

**Components to Update:**
```typescript
// app/(auth)/(tabs)/profile/index.tsx
// app/(auth)/friends/index.tsx
// app/(auth)/notifications/index.tsx
// components/ProfileHeader.tsx
// components/FriendsList.tsx
// components/NotificationsList.tsx
```

**Migration Pattern:**
```typescript
// OLD:
const { user, loading } = useUserData();
const { friends, loading: friendsLoading } = useGetMyFriends();

// NEW:
const { data: user, isLoading: loading } = useUserData();
const { data: friends, isLoading: friendsLoading } = useGetMyFriends();
```

### Daily Migration Schedule

#### Day 1: Discover Screen
- [ ] Migrate `app/(auth)/(tabs)/discover/index.tsx`
- [ ] Test location-based event discovery
- [ ] Test nearby events functionality

#### Day 2: Search Components
- [ ] Migrate `app/(auth)/search/index.tsx`
- [ ] Test search functionality
- [ ] Test search results rendering

#### Day 3: Profile Components
- [ ] Migrate `app/(auth)/(tabs)/profile/index.tsx`
- [ ] Test user data loading
- [ ] Test profile display

#### Day 4: Friends & Social
- [ ] Migrate friends-related components
- [ ] Test friend requests functionality
- [ ] Test social features

#### Day 5: Notifications
- [ ] Migrate notification components
- [ ] Test notification display
- [ ] Test mark as read functionality

## Phase 4: Advanced & Specialized Components (Week 4)

#### Category F: Calendar Components
**Hooks Used:** `useCalendarEventsQuery`, `useOptimalCalendarQuery` (keep existing if working)

**Components to Update:**
```typescript
// app/(auth)/(tabs)/calendar/index.tsx
// components/CalendarView.tsx
// components/MonthView.tsx
// components/EventOccurrences.tsx
```

**Migration Strategy:**
- Keep existing `useOptimalCalendarQuery` if it's working well
- Only migrate `useCalendarEventsQuery` if needed
- Focus on testing calendar functionality

#### Category G: AI & Insights Components
**Hooks Used:** `useAIInsightsQuery`, `useEventActions`

**Components to Update:**
```typescript
// components/AIInsightCard.tsx
// app/(auth)/(tabs)/home/index.tsx (insights section)
```

**Migration Pattern:**
```typescript
// OLD:
const { data: insight, loading, invalidateInsights } = useAIInsightsQuery(options);

// NEW:
const { data: insight, isLoading: loading, invalidateInsights } = useAIInsightsQuery(options);
```

#### Category H: Infinite Scroll Components  
**Hooks Used:** `useInfiniteQueries`

**Components to Update:**
```typescript
// components/InfiniteEventsList.tsx
// app/(auth)/infiniteScroll/[type].tsx
```

**Migration Pattern:**
```typescript
// OLD: (if using custom infinite scroll)
// NEW:
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
} = useInfiniteRecommendedEvents();

const events = data?.pages.flatMap(page => page.events) || [];
```

## Phase 5: Testing & Optimization (Week 5)

### Comprehensive Testing

#### Functional Testing Checklist
- [ ] **Event Loading**: All event detail pages load correctly
- [ ] **User Relationships**: All user status/permissions display correctly  
- [ ] **Cache Updates**: Mutations update UI immediately without refetch
- [ ] **List Consistency**: Event changes reflect in all relevant lists
- [ ] **Error Handling**: All error states display appropriately
- [ ] **Loading States**: All loading states work smoothly
- [ ] **Pull-to-Refresh**: Refresh functionality works on all lists
- [ ] **Pagination**: Infinite scroll and pagination work correctly
- [ ] **Search**: Search functionality returns correct results
- [ ] **Offline**: App works offline and syncs when back online

#### Performance Testing
- [ ] **Initial Load**: App starts faster (less complex query keys)
- [ ] **Navigation**: Switching between screens is smoother
- [ ] **Memory Usage**: Lower memory usage (better cache management)
- [ ] **Network Requests**: Fewer unnecessary refetches

#### User Experience Testing
- [ ] **Instant Updates**: UI updates feel instant after user actions
- [ ] **Consistent State**: Data is consistent across all screens
- [ ] **Error Recovery**: App recovers gracefully from errors

### Performance Optimizations

#### Cache Optimization
```typescript
// Add these optimizations where needed:

// 1. Prefetch event details when hovering over event cards
const { prefetchEventDetails } = useQueryUtils();
const handleEventHover = (eventId: string) => {
  prefetchEventDetails(eventId);
};

// 2. Prefetch next calendar month
const prefetchNextMonth = () => {
  // Implementation based on calendar navigation
};

// 3. Smart invalidation after user actions
const { afterEventAction } = useEventActions();
const handleJoinEvent = async (eventId: string) => {
  await joinEvent({ eventId, status: 'accepted' });
  afterEventAction('joinEvent'); // Invalidates AI insights
};
```

## Phase 6: Cleanup & Documentation (Week 6)

### Remove Old Files
```bash
# Remove old hooks (only after full migration)
rm client/hooks/useEventByIdQuery.old.ts
rm client/hooks/useUpcomingEventsQuery.old.ts
# ... remove all .old.ts files

# Remove over-engineered utilities  
rm client/utils/stableQueryKey.ts
rm client/utils/queryFunctions.old.ts
rm client/utils/queryKeys.old.ts

# Keep one backup of old utils in case of emergency
mkdir client/utils/backup
mv client/utils/*.old.ts client/utils/backup/
```

### Update Documentation
- [ ] Update README with new hook usage patterns
- [ ] Document component migration patterns for future reference
- [ ] Create troubleshooting guide for common issues
- [ ] Update API documentation

### Code Quality
- [ ] Run linter and fix any issues
- [ ] Remove unused imports
- [ ] Remove commented-out old code
- [ ] Add TypeScript strict mode if not enabled

## Migration Compatibility Helpers

### Create Wrapper Hooks for Complex Migrations

```typescript
// client/hooks/useEventMutationsCompat.ts
// Wrapper to maintain backward compatibility during migration
import { 
  useEventResponseMutation, 
  useJoinEventMutation, 
  useCancelEventMutation 
} from '@/hooks/useEventMutations.new';

export const useEventMutationsCompat = () => {
  const respondMutation = useEventResponseMutation();
  const joinMutation = useJoinEventMutation();
  const cancelMutation = useCancelEventMutation();
  
  return {
    // Old interface
    respondToInvitation: respondMutation.mutate,
    joinEvent: joinMutation.mutate,
    cancelEvent: cancelMutation.mutate,
    loading: respondMutation.isPending || joinMutation.isPending || cancelMutation.isPending,
    error: respondMutation.error || joinMutation.error || cancelMutation.error,
    
    // New interface available too
    respondMutation,
    joinMutation,
    cancelMutation,
  };
};
```

## Risk Mitigation

### Rollback Plan
```typescript
// If issues arise, quick rollback:
// 1. Revert core files
mv client/utils/queryKeys.backup.ts client/utils/queryKeys.ts
mv client/utils/queryFunctions.backup.ts client/utils/queryFunctions.ts

// 2. Revert specific hooks
mv client/hooks/useEventByIdQuery.old.ts client/hooks/useEventByIdQuery.ts

// 3. Test critical functionality
// 4. Fix issues and retry migration
```

### Critical Path Protection
Always test these components first as they're most critical:
1. Event detail viewing (`useEventByIdQuery`)
2. Event joining/leaving (`useEventMutations`)
3. Home screen event loading (`useUpcomingEventsQuery`)
4. Event creation (`useCreateEventMutation`)

### Monitoring During Migration
- [ ] Monitor error rates in analytics
- [ ] Watch for user complaints about functionality
- [ ] Monitor app performance metrics
- [ ] Keep logs of migration progress

## Success Metrics

### Technical Metrics
- [ ] **50% reduction** in TanStack Query related code
- [ ] **Faster app startup** due to simpler query keys
- [ ] **Better memory usage** due to improved cache management
- [ ] **Fewer network requests** due to smarter invalidation

### User Experience Metrics  
- [ ] **Instant UI updates** after user actions
- [ ] **Consistent data** across all screens
- [ ] **Better offline experience** with proper error handling
- [ ] **Smoother navigation** with better caching

## Conclusion

This migration plan provides a systematic approach to moving from the over-engineered TanStack Query implementation to the clean, efficient new version. By following this week-by-week plan, you'll end up with:

- ✅ **Simpler, more maintainable code**
- ✅ **Better performance and user experience**  
- ✅ **Perfect alignment with your consistent backend**
- ✅ **Robust caching that leverages user relationship data**
- ✅ **A scalable foundation for future features**

The key is to take it slow, test thoroughly, and maintain the ability to rollback at any point. Good luck with the migration! 🚀