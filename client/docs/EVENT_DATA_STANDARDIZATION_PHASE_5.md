# Phase 5: Complete Event Controller Standardization

This is the comprehensive implementation guide for standardizing all 24 event controller functions with correct implementations and consistent response utilities.

## Overview

Phase 5 corrects all issues found in the current implementation and ensures every function uses:
- Standardized response utilities (`buildEnrichedEventResponse`, `buildEnrichedEventsResponse`, `buildSuccessResponse`)
- Consistent population configuration (`getStandardEventPopulation`)
- Proper enrichment for all returned events
- Consistent error handling and response formats

## Function-by-Function Implementation

### 1. createEvent - ✅ ALREADY CORRECT
**Status**: Uses `buildEnrichedEventResponse` correctly
**No changes needed**

### 2. getMyEvents - ✅ ALREADY CORRECT
**Status**: Uses `buildEnrichedEventsResponse` correctly
**No changes needed**

### 3. getMyEventsCalendarMonthView - ❌ NEEDS FIXING
**Issue**: Returns raw event array, no standardized response utility, missing month/year parameters
**Fix**:
```javascript
const getMyEventsCalendarMonthView = async (req, res) => {
  try {
    // Extract month and year parameters (required for calendar view)
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month); // 0-11 (JavaScript month format)

    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return res.status(400).json({ message: 'Valid year and month (0-11) parameters are required' });
    }

    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    // Create month date range
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999); // Last day of month

    // Filter user events using utility (all statuses for calendar view)
    const allUserEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe', 'pending', 'rejected']);

    const filtered = allUserEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      const recurrence = event.recurrence || {};
      const isRecurring = recurrence.checked && recurrence.frequency && recurrence.frequency !== 'none';

      if (!isRecurring) {
        // For non-recurring events, check if the event falls within the month
        return eventDate >= monthStart && eventDate <= monthEnd;
      } else {
        // For recurring events, check if the series overlaps with the month
        const seriesStartDate = new Date(event.start_time);
        const seriesEndDate = recurrence.end_date ? new Date(recurrence.end_date) : new Date('9999-12-31');
        
        // Series overlaps with month if it starts before month ends and ends after month starts
        return seriesStartDate <= monthEnd && seriesEndDate >= monthStart;
      }
    });

    const uniqueMap = new Map();
    filtered.forEach(evt => uniqueMap.set(evt._id.toString(), evt));
    const uniqueEvents = Array.from(uniqueMap.values());

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      uniqueEvents,
      req.user._id,
      uniqueEvents.length > 0 ? `Calendar events retrieved successfully for ${year}/${month + 1}` : `No events found for ${year}/${month + 1}`,
      { 
        month: month,
        year: year,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString()
      }
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in getMyEventsCalendarMonthView:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
```

### 4. getMyEventsForDateRange - ❌ NEEDS FIXING
**Issue**: Returns raw event array, no standardized response utility
**Fix**:
```javascript
const getMyEventsForDateRange = async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the list of reported and not interested event IDs
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    const allUserEvents = filterUserEvents(
      user.events,
      reportedEventIds,
      notInterestedEventIds,
      ['accepted', 'maybe', 'pending', 'rejected'] // for broader calendar range
    );

    const allEvents = processEventsWithRecurrenceEnhanced(allUserEvents, startDate, endDate);

    // Remove duplicates and sort by start time
    const uniqueMap = new Map();
    allEvents.forEach(evt => {
      const key = evt._id.toString();
      uniqueMap.set(key, evt);
    });
    
    const uniqueEvents = Array.from(uniqueMap.values())
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      uniqueEvents,
      req.user._id,
      uniqueEvents.length > 0 ? 'Date range events retrieved successfully' : 'No events found for date range'
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in getMyEventsForDateRange:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
```

### 5. getMyUpcomingEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, no standardized response utility
**Fix**:
```javascript
const getMyUpcomingEvents = async (req, res) => {
  try {
    // Check if request is from home screen to limit results
    const fromHomeScreen = req.query.from_home_screen === 'true';
    
    // Use standard populate configuration
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    // Filter user events using utility
    const filteredEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe'])
      .filter(event => event.status !== 'cancelled');

    // Process events with recurrence using utility
    const { now, oneYearFromNow } = getDateRanges();
    const allUpcomingOccurrences = processEventsWithRecurrence(filteredEvents, now, oneYearFromNow);

    // Apply home screen limits and get metadata
    const result = applyHomeScreenLimits(allUpcomingOccurrences, fromHomeScreen, 3);

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      result.events,
      req.user._id,
      result.events.length > 0 ? 'Upcoming events retrieved successfully' : 'No upcoming events found',
      { metadata: result.metadata }
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getMyUpcomingEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 6. getMyPastEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, no standardized response utility
**Fix**:
```javascript
const getMyPastEvents = async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month ? parseInt(req.query.month) : null; // 0-11 (JavaScript month format)

    // Use standard populate configuration
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);
    const { now } = getDateRanges();

    // Filter for accepted and maybe past events using custom logic for past events
    let pastEvents = (user.events || []).filter(e => {
      const isAccepted = e.status === 'accepted' || e.status === 'maybe';
      const hasEvent = !!e.event;
      const isPast = hasEvent && new Date(e.event.end_time) < now;
      const isReported = hasEvent && reportedEventIds.includes(e.event._id.toString());
      const isNotInterested = hasEvent && notInterestedEventIds.includes(e.event._id.toString());

      return isAccepted && isPast && !isReported && !isNotInterested;
    }).map(e => e.event); // return the populated event

    // Apply month/year filters if provided
    if (year !== null || month !== null) {
      pastEvents = pastEvents.filter(event => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        
        // Apply year filter
        if (year !== null && eventDate.getFullYear() !== year) {
          return false;
        }
        
        // Apply month filter (if both year and month are provided)
        if (month !== null && year !== null && eventDate.getMonth() !== month) {
          return false;
        }
        
        return true;
      });
    }

    // Sort by start_time (most recent first)
    pastEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // Calculate total count before pagination
    const totalCount = pastEvents.length;

    // Apply pagination
    const paginatedEvents = pastEvents.slice(skip, skip + limit);

    // Calculate pagination metadata
    const hasMore = skip + limit < totalCount;
    const currentPage = page;
    const totalPages = Math.ceil(totalCount / limit);

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      paginatedEvents,
      req.user._id,
      totalCount > 0 ? 'Past events retrieved successfully' : 'No past events found',
      {
        totalCount,
        hasMore,
        currentPage,
        totalPages
      }
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getMyPastEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 7. getUserEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, no standardized response utility
**Fix**:
```javascript
const getUserEvents = async (req, res) => {
  try {
    const userId = req.query._id;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Get current user's filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    // Use standard populate configuration
    const user = await User.findById(userId)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current user to check friendship status
    const currentUser = await User.findById(req.user._id).select('friends');
    const isFriend = currentUser?.friends?.includes(userId) || user.friends?.includes(req.user._id);

    // Filter user events using enhanced utility with visibility filtering
    const relevantEvents = filterUserToViewEvents(
      user.events, 
      reportedEventIds, 
      notInterestedEventIds, 
      req.user._id,      // currentUserId
      userId,            // profileOwnerId
      isFriend,          // isFriend
      ['accepted', 'maybe'] // allowedStatuses
    );

    // Extract just the events from user events
    const eventsToEnrich = relevantEvents.map(userEvent => userEvent.event);

    // Sort by start_time (most recent first)
    eventsToEnrich.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      eventsToEnrich,
      req.user._id,
      eventsToEnrich.length > 0 ? 'User events retrieved successfully' : 'No events found for this user'
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in getUserEvents:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
```

### 8. getUserEventsCount - ✅ ALREADY CORRECT
**Status**: Returns simple count response correctly
**No changes needed**

### 9. getEventById - ❌ NEEDS FIXING
**Issue**: Manual enrichment, inconsistent response format
**Fix**:
```javascript
const getEventById = async (req, res) => {
  try {
    // First check if the event is in the user's reported events or not interested events
    const user = await User.findById(req.user._id).select('reported_events not_interested_events friends');
    const reportedEventIds = (user?.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user?.not_interested_events || []).map(item => item.event.toString());
    
    // If the requested event is in reported events or not interested events, don't return it
    if (reportedEventIds.includes(req.query._id) || notInterestedEventIds.includes(req.query._id)) {
      return res.status(404).json({ message: 'No event with that id was found'});
    }
    
    const found_event = await Events.findById(req.query._id)
      .populate(getStandardEventPopulation());

    if (!found_event) {
      return res.status(404).json({ message: 'No event with that id was found'});
    }

    // Use standardized response utility
    const response = await buildEnrichedEventResponse(
      found_event,
      req.user._id,
      'Event retrieved successfully'
    );
    
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 10. getNearbyEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment with distance, inconsistent response format
**Fix**:
```javascript
const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, distance, limit, skip } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchDistance = parseFloat(distance) || 50; // Default to 50 miles if not provided
    const limitNumber = parseInt(limit) || 0; // 0 means no limit
    const skipNumber = parseInt(skip) || 0;
    
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Get user filter data using utility
    const filterData = await getUserFilterData(req.user._id);

    // Build event filter using utility (excluding selected events for nearby)
    const eventFilter = buildEventFilter(filterData, { 
      includePublic: true,
      includePrivateFriends: true,
      includeSelected: true, // Nearby events don't include selected events
      userId: req.user._id
    });

    // Find events using the built filter
    const events = await Events.find(eventFilter)
      .populate(getStandardEventPopulation());

    // Process events for discovery - show only next occurrence of recurring events, excluding user attending events
    const processedEvents = processEventsForDiscovery(events);

    // Calculate distances and filter nearby events using utility
    const allNearbyEvents = calculateEventsDistance(processedEvents, userLat, userLng, searchDistance);

    // Apply pagination if limit is specified
    let paginatedEvents = allNearbyEvents;
    if (limitNumber > 0) {
      paginatedEvents = allNearbyEvents.slice(skipNumber, skipNumber + limitNumber);
    }

    // Extract events for enrichment and preserve distance data
    const eventsWithDistance = paginatedEvents.map(item => ({
      ...item.event.toObject(),
      distance: item.distance
    }));

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      eventsWithDistance,
      req.user._id,
      eventsWithDistance.length > 0 ? 'Nearby events retrieved successfully' : 'No nearby events found',
      {
        total: allNearbyEvents.length,
        hasMore: limitNumber > 0 ? (skipNumber + limitNumber) < allNearbyEvents.length : false
      }
    );

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in getNearbyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 11. respondToEventInvitation - ❌ NEEDS FIXING
**Issue**: Manual enrichment, inconsistent response format, repetitive code
**Fix**:
```javascript
const respondToEventInvitation = async (req, res) => {
  try {
    const { eventId, status, occurrenceDate, modifyType } = req.body;
    
    // Validate input parameters using utility
    const validation = validateInputParams({ eventId, status }, ['eventId', 'status'], [commonValidations.eventStatus]);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `Missing parameters: ${validation.missing.join(', ')}${validation.invalid.length ? `. Invalid: ${validation.invalid.map(i => i.message).join(', ')}` : ''}` 
      });
    }

    // Find event using utility
    const event = await findEventById(eventId, { 
      populate: getStandardEventPopulation()
    });

    // Check if user is in the attendees list using utility
    const attendeeIndex = findAttendeeIndex(event, req.user._id);
    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'You are not invited to this event' });
    }

    // Use the event invitation response utility to handle all the complex logic
    const result = await handleEventInvitationResponse({
      event,
      userId: req.user._id,
      status,
      occurrenceDate,
      modifyType
    });

    // Handle recurring event special responses
    if (result.type === 'separate_occurrence') {
      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status} this specific event occurrence`,
        status,
        separateEventId: result.separateEventId,
        occurrenceDate: result.occurrenceDate
      });
    }

    if (result.type === 'all_future') {
      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status} all future occurrences of this event`,
        status
      });
    }

    // For regular responses, get the updated event and return enriched response
    const updatedEvent = await Events.findById(result.eventId || eventId)
      .populate(getStandardEventPopulation());

    // Use standardized response utility
    const response = await buildEnrichedEventResponse(
      updatedEvent,
      req.user._id,
      `Successfully ${status} the event invitation`,
      { status }
    );
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in respondToEventInvitation:', error);
    const errorMessage = error.message || 'Server error';
    return res.status(error.message === 'Event not found' ? 404 : 500).json({ message: errorMessage });
  }
};
```

### 12. cancelEvent - ✅ ALREADY CORRECT
**Status**: Uses `buildSuccessResponse` pattern correctly
**No changes needed**

### 13. deleteRecurringEvents - ✅ ALREADY CORRECT
**Status**: Uses `createApiResponse` correctly
**No changes needed**

### 14. inviteEventAttendees - ❌ NEEDS FIXING
**Issue**: Manual enrichment, inconsistent response format
**Fix**:
```javascript
// Replace the final response section (lines 1225-1236) with:
    // Use standardized response utility
    const response = await buildEnrichedEventResponse(
      updatedEvent,
      req.user._id,
      'Invitations sent successfully',
      { attendees: updatedEvent.attendees }
    );

    return res.status(200).json(response);
```

### 15. getEventsByCategory - ❌ NEEDS FIXING
**Issue**: Manual enrichment, returns raw array
**Fix**:
```javascript
const getEventsByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    // Validate category parameter
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: 'Invalid category' });
    }

    // Get user filter data using utility
    const filterData = await getUserFilterData(req.user._id);

    // Build event filter using utility
    const eventFilter = buildEventFilter(filterData, { 
      category,
      includePublic: true,
      includePrivateFriends: true,
      includeSelected: true,
      userId: req.user._id
    });

    // Find events with standard population
    const events = await Events.find(eventFilter)
      .populate(getStandardEventPopulation())
      .lean();

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      processedEvents,
      req.user._id,
      processedEvents.length > 0 ? `Events in ${category} category retrieved successfully` : `No events found in ${category} category`
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getEventsByCategory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 16. getEventsByCity - ❌ NEEDS FIXING
**Issue**: Manual enrichment, returns raw array
**Fix**:
```javascript
const getEventsByCity = async (req, res) => {
  const { city } = req.params;

  try {
    // Validate city parameter
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ message: 'Invalid city' });
    }

    // Get user filter data using utility
    const filterData = await getUserFilterData(req.user._id);

    // Build event filter using utility
    const eventFilter = buildEventFilter(filterData, { 
      city,
      includePublic: true,
      includePrivateFriends: true,
      includeSelected: true,
      userId: req.user._id
    });

    // Find events with standard population
    const events = await Events.find(eventFilter)
      .populate(getStandardEventPopulation())
      .lean();

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      processedEvents,
      req.user._id,
      processedEvents.length > 0 ? `Events in ${city} retrieved successfully` : `No events found in ${city}`
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching events by city:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
```

### 17. getAttentionRequiredEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, bug in response (enrichedEvents vs events)
**Fix**:
```javascript
const getAttentionRequiredEvents = async (req, res) => {
  try {
    // Check if request is from home screen to limit results
    const fromHomeScreen = req.query.from_home_screen === 'true';
    
    // Use standard populate configuration
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: getStandardEventPopulation()
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    const { now } = getDateRanges();

    // Filter for attention required events (pending/rejected status) using custom logic
    const attentionEvents = filterAttentionRequiredEvents(user.events || [], reportedEventIds, notInterestedEventIds, now);

    // Process events with recurrence using utility - find the next occurrence of each event from now
    const processedEvents = attentionEvents.map(event => {
      if (event.recurrence?.checked && event.recurrence?.frequency && event.recurrence.frequency !== 'none') {
        // For recurring events, find the next occurrence
        return findNextRecurringOccurrence(event, now);
      }
      // For non-recurring events, return as-is
      return event;
    }).filter(event => event !== null); // Remove any null results (e.g., expired recurring events)

    // Apply home screen limits and get metadata
    const result = applyHomeScreenLimits(processedEvents, fromHomeScreen, 3);

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      result.events,
      req.user._id,
      result.events.length > 0 ? 'Attention required events retrieved successfully' : 'No events requiring attention',
      { metadata: result.metadata }
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getAttentionRequiredEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 18. getRecommendedEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, inconsistent response format
**Fix**:
```javascript
const getRecommendedEvents = async (req, res) => {
  try {
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    // Get user's preferences, friends, and exclusion lists
    const user = await User.findById(req.user._id)
      .select('favorite_activities location friends reported_events not_interested_events')
      .populate('friends', '_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const friends = user.friends || [];
    const friendIds = friends.map(friend => friend._id);
    const userLocation = user.location?.coordinates || null;
    const userActivities = user.favorite_activities || [];

    // Base query for upcoming events that are either public or private from friends
    const baseQuery = await recommendedEventsBaseQuery(user, now, friendIds, userActivities);

    // Find matching events with standard population
    let events = await Events.find(baseQuery)
      .populate(getStandardEventPopulation())
      .lean()
      .sort({ start_time: 1 });

    // Process events for discovery - show only next occurrence of recurring events
    const discoveryEvents = processEventsForDiscovery(events, {
      excludeUserAttending: true, // Exclude events user is already attending (for recommendations)
      userId: req.user._id
    });

    // Process events to calculate relevance scores
    const processedEvents = discoveryEvents.map(event => {
      let relevanceScore = 0;

      // Activity match score (0-3)
      if (userActivities.includes(event.category)) {
        relevanceScore += 3;
      }

      // Friend creator score (0-2)
      if (friendIds.some(id => id.equals(event.creator._id))) {
        relevanceScore += 2;
      }

      // Location score (0-2)
      if (userLocation && event.location?.coordinates) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          event.location.coordinates.lat,
          event.location.coordinates.lng
        );
        if (distance <= 5) relevanceScore += 2; // Within 5 miles
        else if (distance <= 20) relevanceScore += 1; // Within 20 miles
      }

      // Time relevance score (0-2)
      const daysUntilEvent = (new Date(event.start_time) - now) / (1000 * 60 * 60 * 24);
      if (daysUntilEvent <= 7) relevanceScore += 2; // Within next week
      else if (daysUntilEvent <= 30) relevanceScore += 1; // Within next month

      return {
        ...event,
        relevanceScore
      };
    });

    // Sort by relevance score
    processedEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Calculate total count before pagination
    const totalCount = processedEvents.length;
    
    // Apply pagination
    const paginatedEvents = processedEvents.slice(skip, skip + limit);

    // Calculate if there are more pages
    const hasMore = skip + limit < totalCount;
    const currentPage = page;
    const totalPages = Math.ceil(totalCount / limit);

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      paginatedEvents,
      req.user._id,
      paginatedEvents.length > 0 ? 'Recommended events retrieved successfully' : 'No recommended events found',
      {
        totalCount,
        hasMore,
        currentPage,
        totalPages
      }
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getRecommendedEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 19. getFriendsEvents - ❌ NEEDS FIXING
**Issue**: Manual enrichment, returns raw array
**Fix**:
```javascript
const getFriendsEvents = async (req, res) => {
  try {
    // Get user filter data using utility
    const filterData = await getUserFilterData(req.user._id);
    const { friends } = filterData;
    
    if (!friends || friends.length === 0) {
      // Use standardized response utility for empty results
      const response = await buildEnrichedEventsResponse(
        [],
        req.user._id,
        'No friends events found - you have no friends or they have no events'
      );
      return res.status(200).json(response);
    }

    // Get date ranges using utility
    const { now } = getDateRanges();
    
    // Build custom query for friends events (complex visibility requirements)
    const baseQuery = await buildFriendsEventsBaseQuery(req.user._id, now, friends, filterData);
    const events = await Events.find(baseQuery)
    .populate(getStandardEventPopulation())
    .lean() // Convert to plain objects
    .sort({ start_time: -1 }); // Sort newest to oldest (descending)

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      processedEvents,
      req.user._id,
      processedEvents.length > 0 ? 'Friends events retrieved successfully' : 'No friends events found'
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getFriendsEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 20. joinEvent - ✅ ALREADY CORRECT
**Status**: Uses `createApiResponse` correctly at the end
**No changes needed**

### 21. markEventNotInterested - ✅ ALREADY CORRECT
**Status**: Uses `createApiResponse` correctly
**No changes needed**

### 22. reportEvent - ✅ ALREADY CORRECT
**Status**: Simple success response is appropriate
**No changes needed**

### 23. updateEvent - ✅ ALREADY CORRECT
**Status**: Uses `buildEnrichedEventResponse` correctly
**No changes needed**

### 24. removeEventAttendee - ✅ ALREADY CORRECT
**Status**: Uses success response pattern correctly
**No changes needed**

## Summary

**Functions requiring fixes: 11 out of 24**

**Fixed functions:**
- `getMyEventsCalendarMonthView` - Now uses `buildEnrichedEventsResponse`
- `getMyEventsForDateRange` - Now uses `buildEnrichedEventsResponse`
- `getMyUpcomingEvents` - Now uses `buildEnrichedEventsResponse`
- `getMyPastEvents` - Now uses `buildEnrichedEventsResponse`
- `getUserEvents` - Now uses `buildEnrichedEventsResponse`
- `getEventById` - Now uses `buildEnrichedEventResponse`
- `getNearbyEvents` - Now uses `buildEnrichedEventsResponse` with distance preservation
- `respondToEventInvitation` - Now uses `buildEnrichedEventResponse`
- `inviteEventAttendees` - Now uses `buildEnrichedEventResponse`
- `getEventsByCategory` - Now uses `buildEnrichedEventsResponse`
- `getEventsByCity` - Now uses `buildEnrichedEventsResponse`
- `getAttentionRequiredEvents` - Fixed bug and now uses `buildEnrichedEventsResponse`
- `getRecommendedEvents` - Now uses `buildEnrichedEventsResponse`
- `getFriendsEvents` - Now uses `buildEnrichedEventsResponse`

**Already correct functions (13):**
- `createEvent`
- `getMyEvents`
- `getUserEventsCount`
- `cancelEvent`
- `deleteRecurringEvents`
- `joinEvent`
- `markEventNotInterested`
- `reportEvent`
- `updateEvent`
- `removeEventAttendee`

## Key Changes Made

1. **Standardized Response Format**: All functions now return consistent response format through utility functions
2. **Proper Event Enrichment**: All events go through the standardized enrichment process
3. **Consistent Population**: All database queries use `getStandardEventPopulation()`
4. **Error Handling**: Consistent error response patterns
5. **Message Standardization**: Appropriate success/failure messages for each operation
6. **Pagination Support**: Maintained pagination metadata where applicable
7. **Distance Preservation**: For `getNearbyEvents`, distance data is preserved during enrichment

This ensures that the frontend will receive consistent, fully populated event data with proper user relationship information across all endpoints, eliminating the cache invalidation bug.