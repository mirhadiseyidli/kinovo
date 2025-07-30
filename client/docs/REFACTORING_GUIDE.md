# Events Controller Refactoring Guide

## Overview
This guide shows how to refactor the remaining functions in `eventsController.js` to use the new utility functions in `utils/eventUtils.js`.

## Completed Refactorings
- ✅ `getMyUpcomingEvents` - Reduced from ~100 lines to ~30 lines
- ✅ `getEventsByCategory` - Reduced from ~130 lines to ~25 lines
- ✅ `getEventsByCity` - Reduced from ~160 lines to ~25 lines  
- ✅ `getNearbyEvents` - Reduced from ~130 lines to ~35 lines
- ✅ `getMyPastEvents` - Reduced from ~40 lines to ~25 lines
- ✅ `getAttentionRequiredEvents` - Reduced from ~110 lines to ~40 lines
- ✅ `getFriendsEvents` - Reduced from ~120 lines to ~60 lines

## Total Impact

### Phase 1 - Completed ✅
**Lines of Code Reduced:** ~750 lines → ~240 lines (**~68% reduction**)  
**Duplicated Code Eliminated:** 
- Event filtering logic (7 functions)
- Recurring event processing (7 functions) 
- User data enrichment (6 functions)
- MongoDB query building (4 functions)

### Phase 2 - Additional Opportunities Identified 🔍
**Potential Additional Reduction:** ~400 lines → ~150 lines (**~63% further reduction**)  
**New Patterns Identified:**
- Event-user relationship management (8 functions)
- Attendee management (6 functions) 
- Input validation (12+ functions)
- Permission checks (8 functions)
- Recurring event modifications (5 functions)
- Response standardization (12+ functions)

### Combined Total Potential Impact
**Overall Reduction:** ~1,150 lines → ~390 lines (**~66% total reduction**)  
**Utility Functions Created:** 20 functions covering all major patterns

## Remaining Functions to Consider (Lower Priority)

### 1. `getMyEventsCalendarMonthView`
**Current Code Issues:** 
- Manual user filter extraction
- Custom past event filtering logic

**Refactoring Pattern:**
```javascript
// BEFORE (15+ lines)
const user = await User.findById(req.user._id)
  .populate({...})
  .select('events reported_events not_interested_events');
const reportedEventIds = (user.reported_events || []).map(event => event.toString());
// ... more manual filtering

// AFTER (3 lines)
const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);
const user = await User.findById(req.user._id).populate({...}).select('events');
const pastEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted']);
```

### 2. `getNearbyEvents`
**Current Code Issues:**
- Duplicate event filtering logic 
- Manual recurring event processing
- Manual user enrichment

**Refactoring Pattern:**
```javascript
// BEFORE (80+ lines)
const user = await User.findById(req.user._id).select('friends reported_events not_interested_events');
const events = await Events.find({complex filter});
// ... manual recurring processing
// ... manual user enrichment

// AFTER (15 lines)
const filterData = await getUserFilterData(req.user._id);
const eventFilter = buildEventFilter(filterData, { includePublic: true, includePrivateFriends: true });
const events = await Events.find(eventFilter).populate(...);
const processedEvents = processEventsWithRecurrence(events, now, futureLimit, { 
  excludeUserAttending: true, 
  userId: req.user._id 
});
const enrichedEvents = enrichEventsWithUserData(processedEvents, req.user._id, filterData.friends);
```

### 3. `getEventsByCity`
**Current Code Issues:**
- Identical to `getEventsByCategory` except for city filter

**Refactoring Pattern:**
```javascript
// Replace category filter with city filter
const eventFilter = buildEventFilter(filterData, { 
  city,  // Instead of category
  includePrivateFriends: true,
  includeSelected: true,
  userId: req.user._id
});
```

### 4. `getAttentionRequiredEvents`
**Current Code Issues:**
- Custom status filtering logic
- Manual recurring event processing for 30-day window

**Refactoring Pattern:**
```javascript
// BEFORE
const attentionEvents = (user.events || []).filter(userEvent => {
  // Complex filtering logic for pending/rejected events
});

// AFTER
const attentionEvents = filterUserEvents(
  user.events, 
  reportedEventIds, 
  notInterestedEventIds, 
  [undefined, null, 'pending', 'rejected']  // Custom status array
);
const processedEvents = processEventsWithRecurrence(
  attentionEvents, 
  now, 
  new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)  // 30 days
);
```

### 5. `getFriendsEvents`
**Current Code Issues:**
- Complex friend event filtering 
- Manual recurring event processing
- Duplicate user enrichment

**Refactoring Pattern:**
```javascript
// BEFORE (100+ lines)
const events = await Events.find({complex friend filter});
// ... manual processing

// AFTER (20 lines)
const filterData = await getUserFilterData(req.user._id);
const eventFilter = buildEventFilter(filterData, { 
  includePublic: false,  // Only friend events
  includePrivateFriends: true,
  includeSelected: true,
  userId: req.user._id
});
// Add additional friend-specific filter
eventFilter.$and.push({ creator: { $in: filterData.friends } });
```

### 6. `respondToEventInvitation` & `updateEvent`
**Current Code Issues:**
- Duplicate recurring event modification logic
- Manual separate occurrence creation

**Refactoring Pattern:**
```javascript
// BEFORE (50+ lines of recurring logic)
if (modifyType === 'this_only') {
  const occurrenceStartDate = new Date(occurrenceDate);
  // ... complex occurrence creation logic
}

// AFTER (5 lines)
if (modifyType === 'this_only') {
  const separateEventData = createSeparateOccurrenceData(event, occurrenceDate, updateData);
  const separateEvent = await Events.create(separateEventData);
  await addExcludedDate(event, new Date(occurrenceDate));
}
```

### 7. `getMyEventsForDateRange`
**Current Code Issues:**
- Manual date range filtering
- Duplicate recurring processing

**Refactoring Pattern:**
```javascript
// BEFORE
for (const event of allUserEvents) {
  // Manual date range logic
  // Manual recurring processing
}

// AFTER
const filteredEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds);
const processedEvents = processEventsWithRecurrence(filteredEvents, startDate, endDate);
```

## Benefits of Refactoring

### Code Reduction
- **Before:** ~2,600 lines total
- **After:** ~1,200 lines estimated (53% reduction)

### Specific Improvements:
1. **DRY Principle:** Eliminated 500+ lines of duplicate code
2. **Maintainability:** Changes to recurring logic only need to be made in one place
3. **Testing:** Utility functions can be unit tested independently
4. **Performance:** Consistent filtering patterns across all functions
5. **Bug Reduction:** Single source of truth for complex logic

## Utility Function Usage Summary

### Core Event Processing (Previously Implemented)
| Function | Purpose | Used In |
|----------|---------|---------|
| `getUserFilterData` | Get user's filter lists | All query functions |
| `buildEventFilter` | Create MongoDB filter | Event query functions |
| `processEventsWithRecurrence` | Handle recurring events | All event processing |
| `enrichEventsWithUserData` | Add user-specific fields | Event display functions |
| `filterUserEvents` | Filter user's events | User event functions |
| `createSeparateOccurrenceData` | Create occurrence data | Recurring modifications |
| `addExcludedDate` | Add excluded date | Recurring modifications |

### New Utility Functions (Added)
| Function | Purpose | Replaces Pattern | Used In |
|----------|---------|------------------|---------|
| `findAttendeeIndex` | Find attendee in event | `event.attendees.findIndex(...)` | All attendee operations |
| `findUserEventIndex` | Find event in user's list | `user.events.findIndex(...)` | All user event operations |
| `findEventById` | Find & validate event | `Events.findById + null check` | All event operations |
| `validateEventPermission` | Check user permissions | Manual creator/attendee checks | Permission validation |
| `updateEventAttendee` | Add/update attendee | Manual attendee array manipulation | Join, invite, respond |
| `removeAttendeeFromEvent` | Remove attendee | Manual splice operations | Leave, not interested |
| `updateUserEventStatus` | Update user's event status | Manual user.events manipulation | Status changes |
| `removeUserEvent` | Remove from user's events | Manual user.events splice | Leave, cancel operations |
| `addUserNotInterestedEvent` | Add to not interested list | Manual not_interested_events | Mark not interested |
| `handleRecurringEventModification` | Handle recurring logic | Repeated "this_only" vs "all_future" | All recurring modifications |
| `validateInputParams` | Validate request parameters | Manual parameter validation | Input validation |
| `createApiResponse` | Standardized responses | Manual response creation | All API responses |
| `handleEventInvitationResponse` | Complete invitation workflow | Combined invitation logic | Respond to invitations |

## Additional Refactoring Opportunities

### Functions That Can Use New Utilities

**High Impact Refactoring (30-50 lines reduction each):**
1. **`respondToEventInvitation`** - Can use `handleEventInvitationResponse` utility
2. **`cancelEvent`** - Can use `handleRecurringEventModification` and permission utilities
3. **`inviteEventAttendees`** - Can use attendee management and recurring utilities
4. **`updateEvent`** - Can use `handleRecurringEventModification` and permission utilities
5. **`removeEventAttendee`** - Can use attendee and user event utilities

**Medium Impact Refactoring (15-30 lines reduction each):**
6. **`reportEvent`** - Can use validation and response utilities
7. **`getEventById`** - Can use permission validation utilities

**Example Refactoring - `respondToEventInvitation`:**
```javascript
// BEFORE (80+ lines)
const { eventId, status, occurrenceDate, modifyType } = req.body;
if (!eventId || !status) { /* validation */ }
const event = await Events.findById(eventId);
if (!event) { /* error handling */ }
const attendeeIndex = event.attendees.findIndex(/* ... */);
if (isRecurringEvent && modifyType === 'this_only') {
  // 40+ lines of recurring logic
}
// ... more manual logic

// AFTER (15-20 lines)
const { eventId, status, occurrenceDate, modifyType } = req.body;
const validation = validateInputParams({ eventId, status }, ['eventId', 'status']);
if (!validation.isValid) return res.status(400).json({...});

const result = await handleEventInvitationResponse(
  eventId, 
  req.user._id, 
  status, 
  { occurrenceDate, modifyType }
);

const { response, statusCode } = createApiResponse(true, 'Success', result);
return res.status(statusCode).json(response);
```

## Updated Implementation Priority

### Completed (✅)
- Core event processing utilities (7 functions)
- Event querying functions (7 functions)
- Basic relationship management functions (2 functions)

### Next Phase - High Impact
1. **`respondToEventInvitation`** - Uses `handleEventInvitationResponse`
2. **`cancelEvent`** - Uses recurring modification utilities
3. **`inviteEventAttendees`** - Uses attendee management utilities
4. **`updateEvent`** - Uses recurring modification utilities
5. **`removeEventAttendee`** - Uses relationship utilities

### Final Phase - Polish
6. **Input validation** - Apply `validateInputParams` to all functions
7. **Response standardization** - Apply `createApiResponse` to all functions
8. **Permission checks** - Apply `validateEventPermission` where needed

## Testing Strategy

1. Create unit tests for each utility function
2. Test edge cases (empty arrays, null values, invalid dates)
3. Ensure existing API behavior remains unchanged
4. Performance test with large datasets

This refactoring will significantly improve code maintainability while preserving all existing functionality. 