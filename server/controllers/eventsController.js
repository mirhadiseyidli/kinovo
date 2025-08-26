const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const EventOccurrence = require('../database/schemas/eventOccurenceSchema');
const { RRule } = require('rrule');
const { 
  createEventCreationNotificationForFriends,
  createEventUpdateNotification,
  createEventAttendanceNotification,
  createEventInvitationNotification,
  createNearbyEventNotification
} = require('./notificationsController');
// Event reminder scheduling helpers - efficient system
const {
  scheduleEfficientEventReminders,
  deleteEfficientEventReminders
} = require('../utils/efficientReminderScheduling');
const {
  // Core utilities
  getUserFilterData,
  buildEventFilter,
  processEventsWithRecurrence,
  processEventsWithRecurrenceEnhanced,
  processEventsForDiscovery,
  enrichEventWithUserContext,
  getStandardEventPopulation,
  enrichEventsWithUserData,
  filterUserEvents,
  filterUserToViewEvents,
  
  // Population utilities
  getStandardEventPopulateConfig,
  getEventWithCreatorAndAttendeesPopulate,
  
  // Validation utilities
  validateInputParams,
  commonValidations,
  validateEventCreatorPermission,
  
  // Event CRUD utilities
  findEventById,
  validateEventPermission,
  updateEventAttendee,
  removeAttendeeFromEvent,
  updateUserEventStatus,
  addUserEvent,
  removeUserEvent,
  addUserNotInterestedEvent,
  addUserReportedEvent,
  
  // Recurring event utilities
  handleRecurringEventModification,
  isRecurringEvent,
  sanitizeEventUpdateData,
  getUserAttendanceStatus,
  createSeparateOccurrenceEvent,
  splitRecurringEvent,
  handleThisOccurrenceOnlyUpdate,
  handleThisAndFutureUpdate,
  handleAllInstancesUpdate,
  addExcludedDate,
  
  // User synchronization utilities
  synchronizeUserEventList,
  removeUserFromEvent,
  synchronizeAttendeesWithNewEvent,
  
  // Response utilities
  createApiResponse,
  
  // Date utilities
  getDateRanges,
  
  // Home screen utilities
  applyHomeScreenLimits,
  
  // Notification utilities
  sendEventUpdateNotifications,
  
  // Attendee management utilities
  removeAttendeeFromEventArray,
  createAttendeesListWithoutUser,
  
  // Invitation handling
  handleEventInvitationResponse,
  
  // Index utilities
  findAttendeeIndex,
  findUserEventIndex,
  
  // Distance and location utilities
  toRadians,
  calculateDistance,
  calculateEventsDistance,
  findUsersWithinDistance,
  findUsersWithin50Miles,
  
  // Recurring event date utilities
  generateRecurringEventDates,
  findNextRecurringOccurrence,
  processEventInvitations,
  buildEnrichedEventResponse,
  buildEnrichedEventsResponse,
  buildSuccessResponse,

  // Event create utilities
  upsertUserEvent,
  ensureCreatorIsAttendee,
  addEventToUsers,

  // Attention Required Events utilities
  filterAttentionRequiredEvents,

  // Recommended Events utilities
  recommendedEventsBaseQuery,

  // Friends Events utilities
  buildFriendsEventsBaseQuery,

  validateEventModificationRequest,
  validateEventPermissions,
  handleRecurringEventOperation,
  handleThisOnlyOperation,
  handleAllFutureOperation,
  // Reminder functions removed - handled directly in this file
  sendEventNotifications,
  updateNotificationStatus,
} = require('../utils/eventUtils');

const mapKitService = require('../services/appleMapKitService');

const createEvent = async (req, res) => {
  try {
    const {
      event_picture,
      title,
      category,
      description,
      location,
      start_time,
      end_time,
      capacity,
      recurrence,
      attendees,
      visibility,
      calendarSyncEnabled
    } = req.body;

    // Validate required fields
    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }

    // Validate start_time is before end_time
    if (new Date(start_time) >= new Date(end_time)) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    // Validate recurrence end_date is after event end_time (if recurrence is enabled)
    if (recurrence?.checked && recurrence?.end_date && new Date(end_time) >= new Date(recurrence.end_date)) {
      return res.status(400).json({ error: 'Recurrence end date must be after event end time' });
    }

    // Ensure creator is included in attendees
    const processedAttendees = ensureCreatorIsAttendee(attendees, req.user._id);

    const attendeesWithStatus = (processedAttendees || []).map(({ user }) => ({
      user,
      status: user._id.toString() === req.user._id.toString() ? 'accepted' : 'pending'
    }));

    const event = await Events.create({
      creator: req.user._id,
      event_picture,
      title,
      category,
      description,
      location,
      start_time,
      end_time,
      capacity,
      recurrence,
      attendees: attendeesWithStatus,
      visibility,
      calendarSyncEnabled: calendarSyncEnabled || false
    });

    // Generate map snapshot if location coordinates are provided
    if (location?.coordinates?.lat && location?.coordinates?.lng) {
      try {
        const mapSnapshotResult = await mapKitService.getSnapshotAndUploadToS3({
          lat: location.coordinates.lat,
          lon: location.coordinates.lng,
          eventId: event._id.toString(),
          userId: req.user._id.toString(),
          width: 640,
          height: 265,
          zoom: 15,
          scale: 2
        });

        // Update event with both light and dark map snapshot URLs
        event.location.mapSnapshotUrl = {
          light: mapSnapshotResult.light.cdnUrl,
          dark: mapSnapshotResult.dark.cdnUrl
        };
        await event.save();
      } catch (snapshotError) {
        console.error('Error generating map snapshot:', snapshotError);
        // Don't fail event creation if snapshot generation fails
      }
    }

    // Add this event to the creator's events list with accepted status
    await upsertUserEvent(req.user._id, event._id, 'accepted');

    // Add event to attendees' events lists with pending status
    const attendeeIds = processedAttendees
      .map(({ user }) => user._id)
      .filter(id => id.toString() !== req.user._id.toString());

    await addEventToUsers(attendeeIds, event._id, 'pending');

    // Send invitation notifications to attendees (excluding creator)
    if (attendeeIds.length > 0) {
      try {
        await createEventInvitationNotification(event._id, attendeeIds);
      } catch (notificationError) {
        console.error('Error sending event invitation notifications:', notificationError);
        // Don't fail the event creation if notification fails
      }
    }

    // Schedule reminders using efficient system
    try {
      await scheduleEfficientEventReminders(event);
    } catch (reminderError) {
      console.error('Error scheduling event reminders during creation:', reminderError);
      // Don't fail event creation if reminder scheduling fails
    }

    // Use utility to build enriched response
    const response = await buildEnrichedEventResponse(
      event._id,
      req.user._id,
      'Event created successfully'
    );

    res.status(201).json(response);
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    // Use standard populate configuration
    const populateConfig = getStandardEventPopulateConfig();
    const user = await User.findById(req.user._id)
      .populate(populateConfig)
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    // Filter user events using utility
    const relevantEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe']);

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      relevantEvents || [],
      req.user._id,
      relevantEvents?.length > 0 ? 'Events retrieved successfully' : 'No events found',
      { totalCount: relevantEvents?.length || 0 }
    );

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      filtered,
      req.user._id,
      filtered.length > 0 ? `Calendar events retrieved successfully for ${year}/${month + 1}` : `No events found for ${year}/${month + 1}`,
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

    // Get the list of reported and not interestedevent IDs
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

    // Process events with recurrence using utility (limit to 3 months for performance)
    const { now, threeMonthsFromNow } = getDateRanges();
    const allUpcomingOccurrences = processEventsWithRecurrence(filteredEvents, now, threeMonthsFromNow);

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

    // Sort by start_time (most recent first)
    relevantEvents.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    // Use standardized response utility
    const response = await buildEnrichedEventsResponse(
      relevantEvents,
      req.user._id,
      relevantEvents.length > 0 ? 'User events retrieved successfully' : 'No events found for this user'
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in getUserEvents:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getUserEventsCount = async (req, res) => {
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

    return res.status(200).json({ count: relevantEvents.length });
  } catch (error) {
    console.error('Error in getUserEventsCount:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

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
}

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
      ...item.event,
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

const respondToEventInvitation = async (req, res) => {
  let result = { statusCode: 500, response: { message: 'Server error' } };
  
  try {
    const { eventId, status, occurrenceDate, modifyType } = req.body;
    
    // Validate request and get event
    const validationResult = await validateEventModificationRequest(req, ['eventId', 'status']);
    if (!validationResult.isValid) {
      result = {
        statusCode: validationResult.error.status,
        response: { message: validationResult.error.message }
      };
    } else if (!['accepted', 'maybe', 'rejected'].includes(status)) {
      result = {
        statusCode: 400,
        response: { message: 'Invalid status. Must be accepted, maybe, or rejected' }
      };
    } else {
      const { event } = validationResult;

      // Check if user is invited
      const attendeeCheck = validateEventPermissions(event, req.user._id, 'attendee');
      if (!attendeeCheck.isValid) {
        result = {
          statusCode: 404,
          response: { message: 'You are not invited to this event' }
        };
      } else {

        // Handle recurring event modifications
        const recurringResult = await handleRecurringEventOperation({
          event,
          occurrenceDate,
          modifyType,
          operation: 'respondInvitation',
          operationData: { status },
          userId: req.user._id
        });

        if (recurringResult.type === 'this_only') {
          // Update both the user's event list AND the event's attendees array with the new status
          await Promise.all([
            updateUserEventStatus(req.user._id, recurringResult.separateEvent._id, status),
            updateEventAttendee(recurringResult.separateEvent, req.user._id, status)
          ]);
          
          const [, response] = await Promise.all([
            // Background operations (can run in parallel)
            Promise.allSettled([
              synchronizeUserEventList(req.user._id, event._id, recurringResult.separateEvent._id, status),
              // Efficient scheduler: ensure reminders are scheduled for the separate event
              scheduleEfficientEventReminders(recurringResult.separateEvent).catch(err => 
                console.error('Error scheduling reminders for separate event:', err)
              )
            ]),
            // Critical path: Build response
            buildEnrichedEventResponse(
              recurringResult.separateEvent,
              req.user._id,
              `Successfully ${status} this specific event occurrence`,
              {
                status,
                separateEventId: recurringResult.separateEvent,
                occurrenceDate: recurringResult.occurrenceDate,
                recurringModificationType: 'this_only',
                masterEventId: event,
                eventToView: recurringResult.separateEvent._id
              }
            )
          ]);

          result = {
            statusCode: 200,
            response
          };
        } else if (recurringResult.type === 'all_future') {
          const [, response] = await Promise.all([
            // Background operation
            // Efficient scheduler: ensure reminders are scheduled for the future event
            scheduleEfficientEventReminders(recurringResult.futureEvent).catch(err => 
              console.error('Error scheduling reminders for future event:', err)
            ),
            // Critical path: Build response
            buildEnrichedEventResponse(
              recurringResult.futureEvent,
              req.user._id,
              `Successfully ${status} all future occurrences of this event`,
              {
                status,
                recurringModificationType: 'all_future',
                originalEventId: event,
                eventToView: recurringResult.futureEvent._id
              }
            )
          ]);

          result = {
            statusCode: 200,
            response
          };

        } else {
          // Handle non-recurring or regular response
          const updatedEvent = await updateEventAttendee(event, req.user._id, status);

          const [, , , response] = await Promise.all([
            // Background operations (don't block response)
            updateUserEventStatus(req.user._id, eventId, status),
            // Efficient scheduler: User responses don't require reminder updates
            Promise.resolve(),
            // Notification operations
            Promise.allSettled([
              sendEventNotifications({
                operation: 'attendance',
                eventId,
                userId: req.user._id,
                status
              }),
              updateNotificationStatus(req.user._id, eventId, 'event_invitation', status)
            ]),
            // Critical path: Build enriched response (consistent with other paths)
            buildEnrichedEventResponse(
              updatedEvent, // Use the updated event object directly
              req.user._id,
              `Successfully ${status} the event invitation`,
              { status }
            )
          ]);
      
          result = {
            statusCode: 200,
            response
          };
        }
      }
    }

  } catch (error) {
    console.error('Error in respondToEventInvitation:', error);
    result = {
      statusCode: 500,
      response: { message: 'Server error' }
    };
  }
  
  return res.status(result.statusCode).json(result.response);
};

const cancelEvent = async (req, res) => {
  let result = { statusCode: 500, response: { message: 'Server error' } };
  
  try {
    const { eventId, occurrenceDate, modifyType } = req.body;
    
    // Validate request and get event
    const validationResult = await validateEventModificationRequest(req, ['eventId']);
    if (!validationResult.isValid) {
      result = {
        statusCode: validationResult.error.status,
        response: { message: validationResult.error.message }
      };
    } else {
      const { event } = validationResult;
      
      // Validate permissions
      const permissionResult = validateEventPermissions(event, req.user._id, 'creator');
      if (!permissionResult.isValid) {
        result = {
          statusCode: permissionResult.error.status,
          response: { message: permissionResult.error.message }
        };
      } else {
        // Handle recurring event modifications
        const recurringResult = await handleRecurringEventOperation({
          event,
          occurrenceDate,
          modifyType,
          operation: 'cancelEvent',
          operationData: {},
          userId: req.user._id
        });
        
        if (recurringResult.type === 'this_only' && recurringResult.cancelled) {
          const attendeeIds = event.attendees.map(att => att.user._id || att.user);
          
          // Efficient scheduler: Canceling a single occurrence doesn't require reminder changes
          // The excluded date prevents reminders from firing for this occurrence

          const notificationAttendeeIds = attendeeIds
            .filter(userId => userId.toString() !== req.user._id.toString());
          
          await sendEventNotifications({
            operation: 'cancel',
            eventId: event._id,
            userId: req.user._id,
            attendeeIds: notificationAttendeeIds
          });

          // Use createApiResponse for consistency
          const apiResponse = createApiResponse(
            true,
            'Successfully cancelled this specific event occurrence',
            { cancelledDate: recurringResult.occurrenceDate }
          );
          
          result = {
            statusCode: apiResponse.statusCode,
            response: apiResponse.response
          };
        } else if (recurringResult.type === 'all_future') {
          // Delete reminders for the cancelled future event
          try {
            await deleteEfficientEventReminders(recurringResult.futureEvent._id);
          } catch (reminderError) {
            console.error('Error deleting reminders for cancelled future event:', reminderError);
          }

          const attendeeIds = recurringResult.futureEvent.attendees
            .map(attendee => attendee.user)
            .filter(userId => userId.toString() !== req.user._id.toString());

          // Remove event from users' lists
          await User.updateMany(
            { 'events.event': recurringResult.futureEvent._id, _id: { $in: attendeeIds } },
            { $pull: { events: { event: recurringResult.futureEvent._id } } }
          );
          
          await sendEventNotifications({
            operation: 'cancel',
            eventId: recurringResult.futureEvent._id,
            userId: req.user._id,
            attendeeIds
          });

          // Use createApiResponse for consistency
          const apiResponse = createApiResponse(
            true,
            'Successfully cancelled this and all future occurrences of this event',
            {
              cancelledFrom: new Date(occurrenceDate),
              futureEventId: recurringResult.futureEvent._id
            }
          );
          
          result = {
            statusCode: apiResponse.statusCode,
            response: apiResponse.response
          };
        } else {
          // Handle non-recurring or cancel entire series
          event.status = 'cancelled';
          await event.save();

          const attendeeIds = event.attendees
            .map(attendee => attendee.user)
            .filter(userId => userId.toString() !== req.user._id.toString());
          
          await sendEventNotifications({
            operation: 'cancel',
            eventId: event._id,
            userId: req.user._id,
            attendeeIds
          });

          // Remove event from users' lists
          await User.updateMany(
            { 'events.event': event._id, _id: { $in: attendeeIds } },
            { $pull: { events: { event: event._id } } }
          );

          // Delete reminders for the cancelled event
          try {
            await deleteEfficientEventReminders(event._id);
          } catch (reminderError) {
            console.error('Error deleting reminders for cancelled event:', reminderError);
          }

          // Use createApiResponse for consistency
          const apiResponse = createApiResponse(
            true,
            'Successfully cancelled the event'
          );
          
          result = {
            statusCode: apiResponse.statusCode,
            response: apiResponse.response
          };
        }
      }
    }

  } catch (error) {
    console.error('Error in cancelEvent:', error);
    result = {
      statusCode: 500,
      response: { message: 'Server error' }
    };
  }
  
  return res.status(result.statusCode).json(result.response);
};

// This was for internal testing purposes
// TODO: Remove this function if not needed
const deleteRecurringEvents = async (req, res) => {
  try {
    // Find all recurring events
    const recurringEvents = await Events.find({
      'recurrence.checked': true,
      'recurrence.frequency': { $ne: null, $ne: 'none' }
    });

    const recurringEventIds = recurringEvents.map(event => event._id);

    // Delete all recurring events from the Events collection
    const deletionResult = await Events.deleteMany({
      'recurrence.checked': true,
      'recurrence.frequency': { $ne: null, $ne: 'none' }
    });

    // Remove references to these events from all users' events arrays
    const userUpdateResult = await User.updateMany(
      { 'events.event': { $in: recurringEventIds } },
      { $pull: { events: { event: { $in: recurringEventIds } } } }
    );

    // Delete all reminders for these recurring events
    for (const event of recurringEvents) {
      try {
        await deleteEfficientEventReminders(event._id);
      } catch (scheduleErr) {
        console.error('Failed to delete reminders for recurring event:', event._id, scheduleErr);
      }
    }

    const response = createApiResponse(
      true,
      `Successfully deleted ${deletionResult.deletedCount} recurring events and updated ${userUpdateResult.modifiedCount} users`,
      {
        deletedCount: deletionResult.deletedCount,
        usersUpdated: userUpdateResult.modifiedCount
      }
    );

    res.status(200).json(response.response);
  } catch (error) {
    console.error('Error deleting recurring events:', error);
    res.status(500).json({ message: 'Server error while deleting recurring events' });
  }
};

const inviteEventAttendees = async (req, res) => {
  let result = { statusCode: 500, response: { message: 'Server error' } };
  
  try {
    const { eventId } = req.params;
    const { invitees, occurrenceDate, modifyType } = req.body;

    // Validate input
    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      result = {
        statusCode: 400,
        response: { message: 'Invalid invitees list' }
      };
    } else {
      // Validate request and get event
      const validationResult = await validateEventModificationRequest(req, ['eventId']);
      if (!validationResult.isValid) {
        result = {
          statusCode: validationResult.error.status,
          response: { message: validationResult.error.message }
        };
      } else {
        const { event } = validationResult;

        // Validate permission (creator or accepted attendee)
        const isCreator = validateEventCreatorPermission(event, req.user._id);
        const isAcceptedAttendee = event.attendees.some(
          att => att.user.toString() === req.user._id.toString() && att.status === 'accepted'
        );

        if (!isCreator && !isAcceptedAttendee) {
          result = {
            statusCode: 400,
            response: { message: 'Not authorized to invite attendees' }
          };
        } else {
          // Handle recurring event modifications
          const recurringResult = await handleRecurringEventOperation({
            event,
            occurrenceDate,
            modifyType,
            operation: 'inviteAttendees',
            operationData: { invitees },
            userId: req.user._id
          });

          if (recurringResult.type === 'this_only') {
            // Add invitees to the separate event
            for (const invitee of invitees) {
              await updateEventAttendee(recurringResult.separateEvent, invitee, 'pending');
              await updateUserEventStatus(invitee, recurringResult.separateEvent._id, 'pending');
            }
            
            const [, response] = await Promise.all([
              // Background operations (can run in parallel)
              Promise.allSettled([
                synchronizeUserEventList(req.user._id, event._id, recurringResult.separateEvent._id),
                // Efficient scheduler: ensure reminders are scheduled for the separate event
                scheduleEfficientEventReminders(recurringResult.separateEvent).catch(err => 
                  console.error('Error scheduling reminders for separate event:', err)
                ),
                sendEventNotifications({
                  operation: 'invite',
                  eventId: recurringResult.separateEvent._id,
                  userId: req.user._id,
                  attendeeIds: invitees
                })
              ]),
              // Critical path: Build response
              buildEnrichedEventResponse(
                recurringResult.separateEvent,
                req.user._id,
                'Successfully invited attendees to this specific event occurrence',
                {
                  separateEventId: recurringResult.separateEvent,
                  occurrenceDate: recurringResult.occurrenceDate,
                  recurringModificationType: 'this_only',
                  masterEventId: event, // Pass the master event object
                  eventToView: recurringResult.separateEvent
                }
              )
            ]);
  
            result = {
              statusCode: 200,
              response
            };
          } else if (recurringResult.type === 'all_future') {
            // First, add the future event to all existing attendees' user.events arrays
            // This ensures the event appears for everyone who was already in the event
            const existingAttendees = recurringResult.futureEvent.attendees || [];
            for (const attendee of existingAttendees) {
              const attendeeUserId = attendee.user._id || attendee.user;
              const attendeeStatus = attendee.status;
              await updateUserEventStatus(attendeeUserId, recurringResult.futureEvent._id, attendeeStatus);
            }
            
            // Then add the new invitees to the future event
            for (const invitee of invitees) {
              await updateEventAttendee(recurringResult.futureEvent, invitee, 'pending');
              await updateUserEventStatus(invitee, recurringResult.futureEvent._id, 'pending');
            }
            
            const [, , response] = await Promise.all([
              // Background operation
              // Efficient scheduler: ensure reminders are scheduled for the future event
              scheduleEfficientEventReminders(recurringResult.futureEvent).catch(err => 
                console.error('Error scheduling reminders for future event:', err)
              ),
              sendEventNotifications({
                operation: 'invite',
                eventId: recurringResult.futureEvent._id,
                userId: req.user._id,
                attendeeIds: invitees
              }),
              // Critical path: Build response
              buildEnrichedEventResponse(
                recurringResult.futureEvent,
                req.user._id,
                'Successfully invited attendees to all future occurrences of this event',
                {
                  recurringModificationType: 'all_future',
                  originalEventId: event, // Pass the original event object
                  eventToView: recurringResult.futureEvent._id
                }
              )
            ]);

            result = {
              statusCode: 200,
              response
            };

          } else {
            // Add to non-recurring or all instances
            for (const invitee of invitees) {
              await updateEventAttendee(event, invitee, 'pending');
              await updateUserEventStatus(invitee, eventId, 'pending');
            }

            const [, , response] = await Promise.all([
              // Efficient scheduler: User responses don't require reminder updates
              Promise.resolve(),
              // Notification operations
              Promise.allSettled([
                await sendEventNotifications({
                  operation: 'invite',
                  eventId,
                  userId: req.user._id,
                  attendeeIds: invitees
                }),
              ]),
              // Critical path: Build enriched response (consistent with other paths)
              buildEnrichedEventResponse(
                event,
                req.user._id,
                'Invitations sent successfully'
              )
            ]);
        
            result = {
              statusCode: 200,
              response
            };
          }
        }
      }
    }

  } catch (error) {
    console.error('Error in inviteEventAttendees:', error);
    result = {
      statusCode: 500,
      response: { message: 'Server error' }
    };
  }
  console.log('this shit', result.response)
  return res.status(result.statusCode).json(result.response);
};

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

const joinEvent = async (req, res) => {
  let result = { statusCode: 500, response: { message: 'Server error' } };
  
  try {
    const { eventId, status, occurrenceDate, modifyType } = req.body;
    
    // Validate request and get event
    const validationResult = await validateEventModificationRequest(req, ['eventId', 'status']);
    if (!validationResult.isValid) {
      result = {
        statusCode: validationResult.error.status,
        response: { message: validationResult.error.message }
      };
    } else if (!['accepted', 'maybe', 'rejected'].includes(status)) {
      result = {
        statusCode: 400,
        response: { message: 'Invalid status. Must be accepted, maybe, or rejected' }
      };
    } else {
      const { event } = validationResult;
      
      // Handle recurring event modifications
      const recurringResult = await handleRecurringEventOperation({
        event,
        occurrenceDate,
        modifyType,
        operation: 'joinEvent',
        operationData: { status },
        userId: req.user._id
      });
      
      if (recurringResult.type === 'this_only') {
        await synchronizeAttendeesWithNewEvent(
          recurringResult.separateEvent.attendees,
          recurringResult.separateEvent._id
        );
        
        // Ensure the new separate event has reminders scheduled
        try {
          await scheduleEfficientEventReminders(recurringResult.separateEvent);
        } catch (reminderError) {
          console.error('Error scheduling reminders for separate event:', reminderError);
        }
        
        // Use buildEnrichedEventResponse to return updated event data for cache
        const response = await buildEnrichedEventResponse(
          recurringResult.separateEvent._id,
          req.user._id,
          `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} this specific event occurrence`,
          {
            separateEventId: recurringResult.separateEvent._id,
            occurrenceDate: recurringResult.occurrenceDate,
            status
          }
        );
        
        result = {
          statusCode: 200,
          response
        };
      } else if (recurringResult.type === 'all_future') {
        // Ensure the new future event has reminders scheduled
        try {
          await scheduleEfficientEventReminders(recurringResult.futureEvent);
        } catch (reminderError) {
          console.error('Error scheduling reminders for future event:', reminderError);
        }
        
        // Use buildEnrichedEventResponse to return updated event data for cache
        const response = await buildEnrichedEventResponse(
          recurringResult.futureEvent._id,
          req.user._id,
          `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} all future occurrences of this event`,
          { status }
        );
        
        result = {
          statusCode: 200,
          response
        };
      } else {
        // Handle non-recurring or all instances
        await updateEventAttendee(event, req.user._id, status);
        await updateUserEventStatus(req.user._id, eventId, status);

        // Efficient scheduler: User responses don't require reminder updates

        // Use buildEnrichedEventResponse to return updated event data for cache
        const response = await buildEnrichedEventResponse(
          event._id,
          req.user._id,
          `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} the event`,
          { status }
        );

        result = {
          statusCode: 200,
          response
        };
      }
    }
    
  } catch (error) {
    console.error('Error in joinEvent:', error);
    result = {
      statusCode: 500,
      response: { message: 'Server error' }
    };
  }
  
  return res.status(result.statusCode).json(result.response);
};

const markEventNotInterested = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    // Validate input parameters using utility
    const validation = validateInputParams({ eventId }, ['eventId']);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `Missing parameters: ${validation.missing.join(', ')}` 
      });
    }

    // Find event using utility
    const event = await findEventById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user has already marked this event as not interested
    const { notInterestedEventIds } = await getUserFilterData(req.user._id);
    if (notInterestedEventIds.includes(eventId)) {
      return res.status(200).json({ message: 'Event already marked as not interested' });
    }

    // Note: With efficient scheduling system, reminders are per-occurrence, not per-user
    // User preferences will be checked when reminders are sent

    // Perform updates in parallel
    await Promise.all([
      addUserNotInterestedEvent(req.user._id, eventId),
      removeAttendeeFromEvent(event, req.user._id),
      removeUserEvent(req.user._id, eventId)
    ]);

    // Create standardized response using utility
    const { response, statusCode } = createApiResponse(
      true, 
      'Successfully marked event as not interested'
    );

    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Error in markEventNotInterested:', error);
    const errorMessage = error.message || 'Server error';
    return res.status(error.message === 'Event not found' ? 404 : 500).json({ message: errorMessage });
  }
};

const reportEvent = async (req, res) => {
  try {
    const { eventId, reason, details } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find the event
    const event = await Events.findById(eventId).populate('creator').select('-password');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate that the user isn't reporting their own event
    if (event.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own event' });
    }

    // Check if user has already reported this event
    const reporter = await User.findById(req.user._id);
    const { reportedEventIds } = await getUserFilterData(req.user._id);
    if (reportedEventIds.includes(eventId)) {
      return res.status(400).json({ message: 'You have already reported this event' });
    }

    const reportData = {
      event: eventId,
      reason,
      details,
      created_at: new Date(),
      status: 'pending'
    }

    // Add report to reporter's event_reports list
    reporter.event_reports.push({
      ...reportData,
      event_creator: event.creator._id
    });

    // Add report to event creator's event_reports_against_me list
    const eventCreator = await User.findById(event.creator._id);
    eventCreator.event_reports_against_me.push({
      ...reportData,
      reporter: reporter._id
    });

    // Note: With efficient scheduling system, reminders are per-occurrence, not per-user
    // User preferences will be checked when reminders are sent

    await Promise.all([reporter.save(), eventCreator.save()]);

    return res.status(200).json({
      success: true,
      message: 'Event reported successfully'
    });
  } catch (error) {
    console.error('Error in reportEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { occurrenceDate, modifyType, ...eventData } = req.body;
    
    // Validate request and get event
    const validationResult = await validateEventModificationRequest(req, ['eventId']);
    
    if (!validationResult.isValid) {
      return res.status(validationResult.error.status).json({ message: validationResult.error.message });
    }
    
    const { event } = validationResult;
    
    // Validate permissions
    const permissionResult = validateEventPermissions(event, req.user._id, 'creator');
    if (!permissionResult.isValid) {
      return res.status(permissionResult.error.status).json({ message: permissionResult.error.message });
    }
    
    // Store original attendees for comparison
    const originalAttendees = event.attendees || [];
    const newAttendees = eventData.attendees || [];
    
    // Process attendee data to preserve existing responses
    let processedEventData = { ...eventData };
    if (newAttendees && newAttendees.length > 0) {
      const existingAttendeesMap = new Map();
      originalAttendees.forEach(attendee => {
        const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
        existingAttendeesMap.set(userId, attendee.status);
      });

      const updatedAttendees = newAttendees.map(attendee => {
        const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
        const existingStatus = existingAttendeesMap.get(userId);
        
        return {
          user: attendee.user,
          status: existingStatus || attendee.status || 'pending'
        };
      });

      processedEventData.attendees = updatedAttendees;
    }
    
    // Handle recurring event modifications
    const recurringResult = await handleRecurringEventOperation({
      event,
      occurrenceDate,
      modifyType,
      operation: 'updateEvent',
      operationData: { eventData: processedEventData },
      userId: req.user._id
    });
    
    let finalEvent = event;
    let finalEventId = event._id;
    let responseMetadata = {};
    
    // === HANDLE THIS_ONLY MODIFICATIONS ===
    if (recurringResult.type === 'this_only') {
      finalEvent = recurringResult.separateEvent;
      finalEventId = recurringResult.separateEvent._id;
      
      // Synchronize all attendees with the new separate event
      await synchronizeAttendeesWithNewEvent(finalEvent.attendees, finalEventId);
      
      // Handle new attendees that were added in this update
      if (newAttendees && newAttendees.length > 0) {
        const originalAttendeeIds = originalAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const newAttendeeIds = newAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const invitedAttendeeIds = newAttendeeIds.filter(id => !originalAttendeeIds.includes(id));
        
        // Add new attendees to users' events lists
        if (invitedAttendeeIds.length > 0) {
          await addEventToUsers(invitedAttendeeIds, finalEventId, 'pending');
        }
      }
      
      // Reschedule reminders for the new separate event
      try {
        await scheduleEfficientEventReminders(finalEvent);
      } catch (reminderError) {
        console.error('Error scheduling reminders for this_only event:', reminderError);
      }
      
      responseMetadata = {
        separateEventId: finalEvent,
        occurrenceDate: recurringResult.occurrenceDate,
        recurringModificationType: 'this_only',
        masterEventId: event,
        eventToView: finalEventId
      };
      
    // === HANDLE ALL_FUTURE MODIFICATIONS ===
    } else if (recurringResult.type === 'all_future') {
      finalEvent = recurringResult.futureEvent;
      finalEventId = recurringResult.futureEvent._id;
      
      // Synchronize all existing attendees with the new future event
      const existingAttendees = finalEvent.attendees || [];
      for (const attendee of existingAttendees) {
        const attendeeUserId = attendee.user._id || attendee.user;
        const attendeeStatus = attendee.status;
        await updateUserEventStatus(attendeeUserId, finalEventId, attendeeStatus);
      }
      
      // Handle new attendees that were added in this update
      if (newAttendees && newAttendees.length > 0) {
        const originalAttendeeIds = originalAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const newAttendeeIds = newAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const invitedAttendeeIds = newAttendeeIds.filter(id => !originalAttendeeIds.includes(id));
        
        // Add new attendees to users' events lists
        if (invitedAttendeeIds.length > 0) {
          await addEventToUsers(invitedAttendeeIds, finalEventId, 'pending');
        }
      }
      
      // Reschedule reminders for the new future event
      try {
        await scheduleEfficientEventReminders(finalEvent);
      } catch (reminderError) {
        console.error('Error scheduling reminders for all_future event:', reminderError);
      }
      
      responseMetadata = {
        recurringModificationType: 'all_future',
        originalEventId: event,
        eventToView: finalEventId
      };
      
    // === HANDLE NON-RECURRING EVENTS ===
    } else {
      // Handle non-recurring event updates
      let updatedAttendees = originalAttendees;
      
      if (newAttendees && newAttendees.length > 0) {
        const existingAttendeesMap = new Map();
        originalAttendees.forEach(attendee => {
          const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
          existingAttendeesMap.set(userId, attendee.status);
        });

        updatedAttendees = newAttendees.map(attendee => {
          const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
          const existingStatus = existingAttendeesMap.get(userId);
          
          return {
            user: attendee.user,
            status: existingStatus || attendee.status || 'pending'
          };
        });
        
        // Add new attendees to users' events lists
        const originalAttendeeIds = originalAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const newAttendeeIds = updatedAttendees.map(attendee => 
          attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
        );
        
        const invitedAttendeeIds = newAttendeeIds.filter(id => !originalAttendeeIds.includes(id));
        
        if (invitedAttendeeIds.length > 0) {
          await addEventToUsers(invitedAttendeeIds, finalEventId, 'pending');
        }
      }

      const sanitizedData = sanitizeEventUpdateData({
        ...eventData,
        attendees: updatedAttendees
      });
      
      Object.assign(event, sanitizedData);
      await event.save();
      
      // Update reminder schedules if needed for non-recurring events
      try {
        if (sanitizedData.status === 'cancelled') {
          await deleteEfficientEventReminders(finalEvent._id);
        } else if (Object.prototype.hasOwnProperty.call(sanitizedData, 'start_time')) {
          // If start time changed, delete old reminders and create new ones
          await deleteEfficientEventReminders(finalEvent._id);
          await scheduleEfficientEventReminders(finalEvent);
        }
      } catch (reminderError) {
        console.error('Error updating reminder schedules:', reminderError);
      }
    }
    
    // === COMMON OPERATIONS FOR ALL CASES ===
    
    // Regenerate map snapshot if location changed
    if (eventData.location?.coordinates?.lat && eventData.location?.coordinates?.lng) {
      try {
        const mapSnapshotResult = await mapKitService.getSnapshotAndUploadToS3({
          lat: eventData.location.coordinates.lat,
          lon: eventData.location.coordinates.lng,
          eventId: finalEvent._id.toString(),
          userId: req.user._id.toString(),
          width: 640,
          height: 265,
          zoom: 15,
          scale: 2
        });

        finalEvent.location.mapSnapshotUrl = {
          light: mapSnapshotResult.light.cdnUrl,
          dark: mapSnapshotResult.dark.cdnUrl
        };
        await finalEvent.save();
      } catch (snapshotError) {
        console.error('Error generating map snapshot during update:', snapshotError);
      }
    }
    
    // Handle notifications for all cases
    if (newAttendees && newAttendees.length > 0) {
      const originalAttendeeIds = originalAttendees.map(attendee => 
        attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
      );
      
      const newAttendeeIds = newAttendees.map(attendee => 
        attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
      );

      const invitedAttendeeIds = newAttendeeIds.filter(id => !originalAttendeeIds.includes(id));
      const remainingAttendeeIds = newAttendeeIds.filter(id => 
        originalAttendeeIds.includes(id) && id !== req.user._id.toString()
      );

      if (invitedAttendeeIds.length > 0) {
        await sendEventNotifications({
          operation: 'invite',
          eventId: finalEventId,
          userId: req.user._id,
          attendeeIds: invitedAttendeeIds
        });
      }

      if (remainingAttendeeIds.length > 0) {
        await sendEventNotifications({
          operation: 'update',
          eventId: finalEventId,
          userId: req.user._id,
          attendeeIds: remainingAttendeeIds
        });
      }
    } else {
      const existingAttendeeIds = originalAttendees
        .map(attendee => attendee.user._id ? attendee.user._id.toString() : attendee.user.toString())
        .filter(id => id !== req.user._id.toString());

      if (existingAttendeeIds.length > 0) {
        await sendEventNotifications({
          operation: 'update',
          eventId: finalEventId,
          userId: req.user._id,
          attendeeIds: existingAttendeeIds
        });
      }
    }

    const response = await buildEnrichedEventResponse(
      finalEventId,
      req.user._id,
      recurringResult.type === 'this_only' 
        ? 'Successfully updated this specific event occurrence'
        : recurringResult.type === 'all_future'
        ? 'Successfully updated all future occurrences of this event'
        : 'Event updated successfully',
      responseMetadata
    );
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in updateEvent:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const removeEventAttendee = async (req, res) => {
  let result = { statusCode: 500, response: { message: 'Server error' } };
  
  try {
    const { eventId, attendeeId } = req.body;
    
    // Validate request and get event
    const validationResult = await validateEventModificationRequest(req, ['eventId', 'attendeeId']);
    
    if (!validationResult.isValid) {
      result = {
        statusCode: validationResult.error.status,
        response: { message: validationResult.error.message }
      };
    } else {
      const { event, occurrenceDate, modifyType } = validationResult;
      
      // Validate permissions
      const permissionResult = validateEventPermissions(event, req.user._id, 'creator');
      
      if (!permissionResult.isValid) {
        result = {
          statusCode: permissionResult.error.status,
          response: { message: permissionResult.error.message }
        };
      } else {
        // Check if attendee exists
        const attendeeCheck = validateEventPermissions(event, attendeeId, 'attendee');
        
        if (!attendeeCheck.isValid) {
          result = {
            statusCode: 404,
            response: { message: 'Attendee is not in this event' }
          };
        } else {
          // Handle recurring event modifications
          const recurringResult = await handleRecurringEventOperation({
            event,
            occurrenceDate,
            modifyType,
            operation: 'removeAttendee',
            operationData: { attendeeId },
            userId: req.user._id
          });
          
          if (recurringResult.type === 'this_only') {
            // Efficient scheduler: Removing attendees doesn't require reminder updates
            await synchronizeAttendeesWithNewEvent(
              recurringResult.separateEvent.attendees,
              recurringResult.separateEvent._id
            );

            await Promise.all([
              removeAttendeeFromEventArray(recurringResult.separateEvent, attendeeId),
              removeUserFromEvent(attendeeId, recurringResult.separateEvent._id)
            ]);
            
            // Build enriched response with updated event
            const response = await buildEnrichedEventResponse(
              recurringResult.separateEvent._id,
              req.user._id,
              'Successfully removed attendee from this specific event occurrence',
              {
                separateEventId: recurringResult.separateEvent._id,
                occurrenceDate: recurringResult.occurrenceDate,
                recurringModificationType: 'this_only',
                masterEventId: event, // Pass the master event object
                eventToView: recurringResult.separateEvent._id
              }
            );
            
            result = {
              statusCode: 200,
              response: {
                ...response,
                separateEventId: recurringResult.separateEvent._id,
                occurrenceDate: recurringResult.occurrenceDate
              }
            };
          } else if (recurringResult.type === 'all_future') {
            // First, add the future event to all existing attendees' user.events arrays
            // This ensures the event appears for everyone who was already in the event
            const existingAttendees = recurringResult.futureEvent.attendees || [];
            for (const attendee of existingAttendees) {
              const attendeeUserId = attendee.user._id || attendee.user;
              const attendeeStatus = attendee.status;
              await updateUserEventStatus(attendeeUserId, recurringResult.futureEvent._id, attendeeStatus);
            }
            // Efficient scheduler: Removing attendees doesn't require reminder updates     
            await Promise.all([
              removeAttendeeFromEventArray(recurringResult.futureEvent, attendeeId),
              removeUserFromEvent(attendeeId, recurringResult.futureEvent._id)
            ]);
            // Build enriched response with updated event
            const response = await buildEnrichedEventResponse(
              recurringResult.futureEvent._id,
              req.user._id,
              'Successfully removed attendee from all future occurrences of this event',
              {
                recurringModificationType: 'all_future',
                originalEventId: event, // Pass the original event object
                eventToView: recurringResult.futureEvent._id
              }
            );
            
            result = {
              statusCode: 200,
              response
            };
          } else {
            // Handle non-recurring or all instances
            // Efficient scheduler: Removing attendees doesn't require reminder updates     
            await Promise.all([
              removeAttendeeFromEventArray(event, attendeeId),
              removeUserFromEvent(attendeeId, event._id)
            ]);
            
            // Fetch the updated event with populated fields
            const updatedEvent = await Events.findById(event._id)
              .populate(getStandardEventPopulation());
            
            // Build enriched response with updated event
            const response = await buildEnrichedEventResponse(
              updatedEvent,
              req.user._id,
              'Successfully removed attendee from the event'
            );
            
            result = {
              statusCode: 200,
              response
            };
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error in removeEventAttendee:', error);
    result = {
      statusCode: 500,
      response: { message: 'Server error' }
    };
  }
  
  return res.status(result.statusCode).json(result.response);
};

module.exports = {
  getMyEvents, // fixed
  getUserEvents, // fixed
  getUserEventsCount, // already good
  createEvent, // fixed
  getMyPastEvents, // fixed
  getMyUpcomingEvents, // fixed
  getMyEventsCalendarMonthView, // fixed
  getMyEventsForDateRange, // fixed
  getEventById, // fixed
  getNearbyEvents, // fixed
  respondToEventInvitation, // fixed
  cancelEvent, // fixed
  deleteRecurringEvents, // internal use tool, not necessary
  inviteEventAttendees, // fixed
  getEventsByCategory, // fixed
  getEventsByCity, // fixed
  getAttentionRequiredEvents, // fixed
  getRecommendedEvents, // fixed
  getFriendsEvents, // fixed
  joinEvent, 
  markEventNotInterested, // already good
  reportEvent, // already good
  updateEvent, // fixed
  removeEventAttendee // fixed
};
