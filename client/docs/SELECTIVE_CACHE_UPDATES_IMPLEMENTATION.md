# Selective Cache Updates + Real-time Event Sync Implementation

## Overview

This document outlines the implementation plan for selective cache updates with real-time event synchronization across users. Instead of invalidating entire caches when events change, we will selectively update/remove specific events from TanStack Query caches and use Firebase Realtime Database for cross-user synchronization.

## Architecture Goals

- ✅ **Selective Updates**: Update only changed events in cache, not entire cache
- ✅ **Real-time Sync**: Events changes from one user instantly reflect to all attendees
- ✅ **Performance**: Avoid unnecessary network requests and UI flickering
- ✅ **Backward Compatible**: Don't break existing functionality
- ✅ **Error Recovery**: Rollback mechanism for failed updates

---

# 📋 **Phase 1: Core Cache Management Infrastructure**

## **Task 3: Create useEventCacheManager hook**
**File:** `/client/hooks/useEventCacheManager.ts`

**Functions to create:**
- `updateEventInCache(eventId, updates)` - Update specific event in all relevant caches
- `removeEventFromCache(eventId, cacheKeys?)` - Remove event from specified caches
- `addEventToCache(event, cacheKeys?)` - Add new event to specified caches
- `getCachedEvent(eventId)` - Retrieve event from cache
- `backupCacheState(eventId)` - Create backup for rollback
- `restoreCacheState(eventId, backup)` - Restore from backup on error

## **Task 4: Create helper functions**
**File:** `/client/hooks/useEventCacheManager.ts` (same file)

**Functions to create:**
- `updateEventInSpecificCache(queryKey, eventId, updates)` - Update in single cache
- `removeEventFromSpecificCache(queryKey, eventId)` - Remove from single cache
- `findEventInCache(queryKey, eventId)` - Find event in specific cache
- `validateCacheUpdate(eventId, updates)` - Validate update before applying

## **Task 5: Create rebalanceTimeBasedCaches function**
**File:** `/client/hooks/useEventCacheManager.ts` (same file)

**Function to create:**
- `rebalanceTimeBasedCaches(eventId, oldTime, newTime, eventData)` - Move events between time-based caches

**Logic:** Move events between upcoming/past based on time changes

## **Task 6: Create updateMultipleCaches function**
**File:** `/client/hooks/useEventCacheManager.ts` (same file)

**Function to create:**
- `updateMultipleCaches(eventId, updates, cacheKeys)` - Batch update across multiple caches

**Cache keys to handle:**
- `['events']` - Main calendar events
- `['upcomingEvents']` - Home screen upcoming
- `['pastEvents']` - Home screen past
- `['attentionRequired']` - Home screen attention required
- `['nearbyEvents']` - Discover nearby
- `['friendsEvents']` - Discover friends events
- `['recommendedEvents']` - Discover recommended
- `['userEvents', userId]` - User-specific events
- `['event', eventId]` - Individual event cache

---

# 📋 **Phase 2: Real-time Synchronization Hooks**

## **Task 7: Create useEventRealtimeSync hook**
**File:** `/client/hooks/useEventRealtimeSync.ts`

**Functions to create:**
- `useEventRealtimeSync()` - Main hook function
- `processEventUpdate(update)` - Process incoming Firebase updates
- `shouldProcessUpdate(update, userId)` - Filter updates to prevent loops
- `handleUpdateByType(eventId, updateType, updateData)` - Handle different update types

**Dependencies:**
- Import `useEventCacheManager` from task 3
- Import `useFirebaseRealtimeData` (existing)
- Import `useAuthSession` (existing)

## **Task 8: Create useEventUpdateNotifier hook**
**File:** `/client/hooks/useEventUpdateNotifier.ts`

**Functions to create:**
- `useEventUpdateNotifier()` - Main hook function
- `notifyEventUpdate(eventId, updateType, updateData, attendees)` - Send Firebase notification
- `generateUpdateId()` - Create unique update ID
- `buildFirebaseUpdatePayload(data)` - Structure Firebase data
- `cleanupOldUpdates(userId)` - Remove old notifications (TTL cleanup)

---

# 📋 **Phase 3: Server-Side Support**

## **Task 9: Create Firebase database structure**
**File:** Server-side Firebase setup

**Structure to create:**
```javascript
/event_updates/{userId}/{updateId}: {
  eventId: string,
  type: 'cancelled' | 'updated' | 'attendeeChange' | 'timeChange',
  timestamp: number,
  updatedBy: string,
  attendees: string[],
  metadata: {
    oldTime?: string,
    newTime?: string,
    field?: string,
    oldValue?: any,
    newValue?: any
  }
}
```

## **Task 10: Add server endpoint**
**File:** `/server/routes/events.js`

**Function to create:**
- `POST /api/events/notify-update` - Endpoint to write Firebase notifications
- `notifyFirebaseEventUpdate(updateData)` - Helper function
- `determineUpdateType(changes)` - Classify update type
- `getEventAttendees(eventId)` - Get affected users
- `cleanupOldFirebaseUpdates()` - Cleanup old notifications

---

# 📋 **Phase 4: Integration with Existing Mutations**

## **Task 11: Update existing event mutation hooks**
**Files to modify:**
- `/client/hooks/useCrudMutations.ts` - Add selective cache updates
- `/client/hooks/useEventMutations.ts` - Replace invalidation with selective updates

**Functions to modify:**
- Existing mutation `onSuccess` callbacks to use `updateEventInCache` instead of `invalidateQueries`

## **Task 12: Update useCreateEventMutation**
**File:** `/client/hooks/useCreateEventMutation.ts`

**Functions to modify:**
- `onSuccess` callback - Use `addEventToCache` instead of `invalidateQueries`
- Add `notifyEventUpdate` call for new event notifications

## **Task 13: Update useEventMutations**
**File:** `/client/hooks/useEventMutations.ts`

**Functions to modify:**
- `cancelEventMutation.onSuccess` - Use `updateEventInCache` with status: 'cancelled'
- `updateEventMutation.onSuccess` - Use `updateEventInCache` with changed fields
- `rsvpMutation.onSuccess` - Use `updateEventInCache` with new userStatus
- Add `notifyEventUpdate` calls to each mutation

---

# 📋 **Phase 5: App Integration**

## **Task 14: Integrate useEventRealtimeSync**
**File:** `/client/app/_layout.tsx` or create new provider

**Changes:**
- Add `useEventRealtimeSync()` call in main app component
- Ensure it runs globally for all authenticated users
- Alternative: Create `<EventSyncProvider>` wrapper component

## **Task 15: Add error handling and rollback**
**File:** `/client/hooks/useEventCacheManager.ts`

**Functions to add:**
- `withRollback(operation, eventId)` - Wrapper for cache operations with rollback
- `validateServerSync(eventId)` - Background validation against server
- `handleCacheError(error, eventId, backup)` - Error recovery logic

## **Task 16: Add logging and debugging**
**File:** `/client/hooks/useEventCacheManager.ts`

**Functions to add:**
- `logCacheOperation(operation, eventId, data)` - Debug logging
- `validateCacheIntegrity(eventId)` - Verify cache consistency
- Add console.log statements for all cache operations (removable in production)

---

# 📋 **Phase 6: Testing and Validation**

## **Task 17: Test selective updates across screens**
**Testing checklist:**
- Home screen: Create event → appears immediately
- Home screen: Cancel event → removed/updated immediately  
- Discover screen: RSVP to event → status updates immediately
- Calendar screen: Time change → moves to correct date immediately
- All screens: Pull-to-refresh still works

## **Task 18: Test real-time sync between users**
**Testing scenarios:**
- User A cancels event → User B sees cancellation instantly
- User A changes event time → User B sees new time instantly
- User A updates event details → User B sees changes instantly
- User A RSVPs → User B sees attendee count change instantly
- Test offline/online scenarios

---

# 🔄 **Implementation Order**

1. **Start with Tasks 3-6** (Core cache management) - Foundation
2. **Tasks 7-8** (Real-time hooks) - Build on foundation  
3. **Tasks 9-10** (Server support) - Enable real-time data flow
4. **Tasks 11-13** (Update mutations) - Replace existing invalidation
5. **Task 14** (App integration) - Connect everything
6. **Tasks 15-16** (Error handling) - Production readiness
7. **Tasks 17-18** (Testing) - Validation

Each task builds on the previous ones and can be tested incrementally without breaking existing functionality.

---

# 📊 **Data Flow Example**

## Scenario: User A cancels event that User B is attending

### Step 1: User A cancels event
```typescript
// User A clicks cancel
const cancelEvent = async (eventId) => {
  // 1. Optimistically update User A's cache
  updateEventInCache(eventId, { status: 'cancelled' });
  
  // 2. Send API request to server
  await api.patch(`/events/${eventId}`, { status: 'cancelled' });
  
  // 3. Server writes to Firebase for all attendees
  await notifyEventUpdate(eventId, 'cancelled', attendees);
};
```

### Step 2: User B receives real-time update
```typescript
// User B's app automatically via Firebase listener
useEffect(() => {
  if (eventUpdate.type === 'cancelled' && eventUpdate.updatedBy !== userId) {
    // Selectively update only this event in cache
    updateEventInCache(eventUpdate.eventId, { status: 'cancelled' });
  }
}, [eventUpdates]);
```

### Step 3: User B's UI updates instantly
```typescript
// Components automatically re-render with updated cache data
const EventCard = ({ eventId }) => {
  const { data: event } = useQuery(['event', eventId]);
  // Shows "CANCELLED" immediately without refetch
  return <Event event={event} />;
};
```

---

# 🎯 **Expected Benefits**

- **Performance**: 90% reduction in unnecessary API calls
- **UX**: Instant updates without loading states or flickering
- **Real-time**: Sub-second synchronization between users
- **Reliability**: Rollback mechanism prevents inconsistent states
- **Scalability**: Selective updates scale better than full invalidation

---

# ⚠️ **Implementation Notes**

1. **Maintain backward compatibility**: Keep existing invalidation as fallback
2. **Test thoroughly**: Each cache update affects multiple screens
3. **Monitor performance**: Ensure selective updates don't cause memory leaks
4. **Error handling**: Always have rollback for failed operations
5. **Documentation**: Update existing hook documentation with new behavior