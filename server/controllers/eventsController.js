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
// Event reminder scheduling helpers (EventBridge Scheduler)
const { putSchedule, deleteSchedule } = require('../aws/eventReminderScheduler');
const {
  // Core utilities
  getUserFilterData,
  buildEventFilter,
  processEventsWithRecurrence,
  processEventsWithRecurrenceEnhanced,
  processEventsForDiscovery,
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

  // Event create utilities
  upsertUserEvent,
  ensureCreatorIsAttendee,
  addEventToUsers,

  // Event reminder scheduling utilities
  scheduleEventReminders,

  // Attention Required Events utilities
  filterAttentionRequiredEvents,

  // Recommended Events utilities
  recommendedEventsBaseQuery,

  // Friends Events utilities
  buildFriendsEventsBaseQuery
} = require('../utils/eventUtils');

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
      visibility
    } = req.body;

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
      visibility
    });

    // Add this event to the creator's events list with accepted status
    await upsertUserEvent(req.user._id, event._id, 'accepted');

    // Add event to attendees' events lists with pending status
    const attendeeIds = attendees
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

    // Schedule both 10-minute and 1-hour reminders using EventBridge Scheduler
    await scheduleEventReminders(event._id, new Date(start_time));

    res.status(201).json({ success: true, event });
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

    if (!relevantEvents || relevantEvents.length === 0) {
      return res.status(200).json({ message: 'No events found', events: [] });
    }

    res.status(200).json({ events: relevantEvents });
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEventsCalendarMonthView = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        select: 'title start_time recurrence status'
      })
      .select('events reported_events not_interested_events');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user filter data using utility
    const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(req.user._id);

    // Get date ranges using utility
    const { pastMonthStart, nextMonthEnd } = getDateRanges();

    // Filter user events using utility (all statuses for calendar view)
    const allUserEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe', 'pending', 'rejected']);

    const filtered = allUserEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      const recurrence = event.recurrence || {};
      const isRecurring = recurrence.checked && recurrence.frequency && recurrence.frequency !== 'none';

      if (!isRecurring) {
        return eventDate >= pastMonthStart && eventDate <= nextMonthEnd;
      } else {
        const endDate = recurrence.end_date ? new Date(recurrence.end_date) : new Date('9999-12-31');
        return endDate >= pastMonthStart;
      }
    });

    const uniqueMap = new Map();
    filtered.forEach(evt => uniqueMap.set(evt._id.toString(), evt));
    const uniqueEvents = Array.from(uniqueMap.values());

    return res.status(200).json({ events: uniqueEvents });
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
        populate: [
          { path: 'creator', select: '-password' },
          {
            path: 'attendees.user',
            model: 'Users',
            select: '-password'
          }
        ]
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

    return res.status(200).json({ events: uniqueEvents });
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
    const filteredEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe'])
      .filter(event => event.status !== 'cancelled');

    // Process events with recurrence using utility
    const { now, oneYearFromNow } = getDateRanges();
    const allUpcomingOccurrences = processEventsWithRecurrence(filteredEvents, now, oneYearFromNow);

    // Apply home screen limits and get metadata
    const result = applyHomeScreenLimits(allUpcomingOccurrences, fromHomeScreen, 3);

    if (result.events.length === 0) {
      return res.status(201).json({ message: 'No events found', events: [] });
    }

    console.log('result', result.events);

    res.status(200).json({ 
      events: result.events,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error in getMyUpcomingEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyPastEvents = async (req, res) => {
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

    const { now } = getDateRanges();

    // Filter for accepted and maybe past events using custom logic for past events
    const pastEvents = (user.events || []).filter(e => {
      const isAccepted = e.status === 'accepted' || e.status === 'maybe';
      const hasEvent = !!e.event;
      const isPast = hasEvent && new Date(e.event.end_time) < now;
      const isReported = hasEvent && reportedEventIds.includes(e.event._id.toString());
      const isNotInterested = hasEvent && notInterestedEventIds.includes(e.event._id.toString());

      return isAccepted && isPast && !isReported && !isNotInterested;
    }).map(e => e.event); // return the populated event

    if (!pastEvents || pastEvents.length === 0) {
      return res.status(201).json({ message: 'No events found', past_events: [] });
    }

    res.status(200).json({ past_events: pastEvents });
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
    const populateConfig = getStandardEventPopulateConfig();
    const user = await User.findById(userId).populate(populateConfig);

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

    relevantEvents.sort((a, b) => new Date(b.event?.start_time) - new Date(a.event?.start_time));

    return res.status(200).json({ events: relevantEvents });
  } catch (error) {
    console.error('Error in getUserEvents:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getEventById = async (req, res) => {
  try {
    // First check if the event is in the user's reported events or not interested events
    const user = await User.findById(req.user._id).select('reported_events not_interested_events friends');
    const reportedEventIds = (user?.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user?.not_interested_events || []).map(item => item.event.toString());
    const friends = user.friends || [];
    
    // If the requested event is in reported events or not interested events, don't return it
    if (reportedEventIds.includes(req.query._id) || notInterestedEventIds.includes(req.query._id)) {
      return res.status(404).json({ message: 'No event with that id was found'});
    }
    
    const found_event = await Events.findById(req.query._id).populate([
      {
        path: 'attendees.user',
        select: '-password', // or exclude password here if needed
      },
      {
        path: 'creator',
        select: '-password', // or exclude password
      }
    ]);

    if (!found_event) {
      return res.status(404).json({ message: 'No event with that id was found'});
    }

    // Add user-specific fields to the event (following pattern from other controllers)
    const userAttendee = found_event.attendees?.find(att => 
      att.user?._id?.toString() === req.user._id.toString()
    );
    const isCreator = found_event.creator._id.toString() === req.user._id.toString();
    const isFriendEvent = friends.some(friendId => 
      friendId.toString() === found_event.creator._id.toString()
    );

    const eventWithUserStatus = {
      ...found_event.toObject(),
      isUserAttending: !!userAttendee,
      isUserInvited: !!userAttendee,
      isUserCreator: isCreator,
      isFriendEvent: isFriendEvent,
      userStatus: userAttendee?.status || null
    };

    res.status(200).json({ found_event: eventWithUserStatus });
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
      includeSelected: false, // Nearby events don't include selected events
      userId: req.user._id
    });

    // Find events using the built filter
    const events = await Events.find(eventFilter)
      .populate('creator', 'first_name last_name username full_name profile_picture');

    // Process events for discovery - show only next occurrence of recurring events, excluding user attending events
    const processedEvents = processEventsForDiscovery(events);

    // Calculate distances and filter nearby events using utility
    const allNearbyEvents = calculateEventsDistance(processedEvents, userLat, userLng, searchDistance);

    // Apply pagination if limit is specified
    let paginatedEvents = allNearbyEvents;
    if (limitNumber > 0) {
      paginatedEvents = allNearbyEvents.slice(skipNumber, skipNumber + limitNumber);
    }

    res.status(200).json({
      events: paginatedEvents.map(item => ({
        ...item.event,
        distance: item.distance
      })),
      total: allNearbyEvents.length,
      hasMore: limitNumber > 0 ? (skipNumber + limitNumber) < allNearbyEvents.length : false
    });

  } catch (error) {
    console.error('Error in getNearbyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const respondToEventInvitation = async (req, res) => {
  try {
    const { eventId, status, occurrenceDate, modifyType } = req.body;
    
    // Validate input parameters
    const validation = validateInputParams({ eventId, status }, ['eventId', 'status']);
    if (!validation.isValid) {
      return res.status(400).json({ message: 'Event ID and status are required' });
    }

    if (!['accepted', 'maybe', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted, maybe, or rejected' });
    }

    // Find the event
    const event = await findEventById(eventId);

    // Check if user is in the attendees list
    const attendeeIndex = findAttendeeIndex(event, req.user._id);
    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'You are not invited to this event' });
    }

    // Handle recurring event modifications
    if (isRecurringEvent(event) && occurrenceDate && modifyType) {
      const modificationResult = await handleRecurringEventModification(
        event, 
        occurrenceDate, 
        modifyType, 
        { userStatus: status }
      );

      if (modificationResult.type === 'separate_occurrence') {
        // Update the separate event's attendee status
        await updateEventAttendee(modificationResult.separateEvent, req.user._id, status);
        
        // Add the new separate event to user's events list
        await synchronizeUserEventList(req.user._id, event._id, modificationResult.separateEvent._id, status);

        return res.status(200).json({ 
          success: true, 
          message: `Successfully ${status} this specific event occurrence`,
          status,
          separateEventId: modificationResult.separateEvent._id,
          occurrenceDate: modificationResult.occurrenceDate
        });

      } else if (modificationResult.type === 'all_future') {
        // Split event if necessary
        const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));
        // Update attendee status in master event
        await updateEventAttendee(futureEvent, req.user._id, status);
        
        // Update user's event status
        await updateUserEventStatus(req.user._id, futureEvent?._id, status);

        return res.status(200).json({ 
          success: true, 
          message: `Successfully ${status} all future occurrences of this event`,
          status 
        });
      }
    }

    // Handle non-recurring events or regular recurring event responses
    await updateEventAttendee(event, req.user._id, status);
    await updateUserEventStatus(req.user._id, eventId, status);

    // Send notification to event host if user accepted
    if (status === 'accepted') {
      try {
        await createEventAttendanceNotification(eventId, req.user._id, status);
      } catch (notificationError) {
        console.error('Error sending attendance notification:', notificationError);
        // Don't fail the response if notification fails
      }
    }

    // Update invitation notification status for this user
    try {
      const Notification = require('../database/schemas/notificationsSchema');
      await Notification.findOneAndUpdate(
        {
          recipient: req.user._id,
          event: eventId,
          type: 'event_invitation'
        },
        {
          status: status,
          is_seen: true,
          updated_at: new Date()
        }
      );
    } catch (notifUpdateErr) {
      console.error('Failed to update invitation notification status:', notifUpdateErr);
    }

    return res.status(200).json({ 
      success: true, 
      message: `Successfully ${status} the event invitation`,
      status 
    });

  } catch (error) {
    console.error('Error in respondToEventInvitation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cancelEvent = async (req, res) => {
  try {
    const { eventId, occurrenceDate, modifyType } = req.body;
    
    // Validate input parameters
    const validation = validateInputParams({ eventId }, ['eventId']);
    if (!validation.isValid) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find and validate event
    const event = await findEventById(eventId);
    
    // Validate creator permission
    if (!validateEventCreatorPermission(event, req.user._id)) {
      return res.status(403).json({ message: 'Only the event creator can cancel the event' });
    }

    // Handle recurring event modifications
    if (isRecurringEvent(event) && occurrenceDate && modifyType) {
      if (modifyType === 'this_only') {
        // Add excluded date for this occurrence only
        await addExcludedDate(event, new Date(occurrenceDate));

        // Send cancellation notifications to all attendees (except creator) for this occurrence
        const attendeeIds = event.attendees
          .map(attendee => attendee.user)
          .filter(userId => userId.toString() !== req.user._id.toString());
        
        if (attendeeIds.length > 0) {
          try {
            await createEventUpdateNotification(eventId, req.user._id, attendeeIds);
          } catch (notificationError) {
            console.error('Error sending event occurrence cancellation notifications:', notificationError);
            // Don't fail the cancellation if notification fails
          }
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully cancelled this specific event occurrence',
          cancelledDate: new Date(occurrenceDate)
        });

      } else if (modifyType === 'all_future' || modifyType === 'this_and_future') {
        // Split the series at the selected occurrence date so that
        // occurrences BEFORE remain intact, occurrences FROM this date onward
        // belong to a new master that we immediately cancel.

        // 1. Split the recurring event
        const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));

        // 2. Cancel the future master (this cancels the chosen occurrence + future)
        futureEvent.status = 'cancelled';
        await futureEvent.save();

        // Send cancellation notifications to all attendees (except creator) for future occurrences
        const attendeeIds = futureEvent.attendees
          .map(attendee => attendee.user)
          .filter(userId => userId.toString() !== req.user._id.toString());

        // Remove event from all users' events lists
        await User.updateMany(
          { 'events.event': futureEvent._id, _id: { $in: attendeeIds } },
          { $pull: { events: { event: futureEvent._id } } }
        );
        
        if (attendeeIds.length > 0) {
          try {
            await createEventUpdateNotification(futureEvent._id, req.user._id, attendeeIds);
          } catch (notificationError) {
            console.error('Error sending future event cancellation notifications:', notificationError);
            // Don't fail the cancellation if notification fails
          }
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully cancelled this and all future occurrences of this event',
          cancelledFrom: new Date(occurrenceDate),
          futureEventId: futureEvent._id
        });
      }
    }

    // Handle non-recurring events or cancel entire recurring series
    event.status = 'cancelled';
    await event.save();

    // Send cancellation notifications to all attendees (except creator)
    const attendeeIds = event.attendees
      .map(attendee => attendee.user)
      .filter(userId => userId.toString() !== req.user._id.toString());
    
    if (attendeeIds.length > 0) {
      try {
        await createEventUpdateNotification(eventId, req.user._id, attendeeIds);
      } catch (notificationError) {
        console.error('Error sending event cancellation notifications:', notificationError);
        // Don't fail the cancellation if notification fails
      }
    }

    // Remove event from all users' events lists
    await User.updateMany(
      { 'events.event': eventId, _id: { $in: attendeeIds } },
      { $pull: { events: { event: eventId } } }
    );

    try {
      await deleteSchedule(eventId, 'all');
    } catch (scheduleErr) {
      console.error('Failed to delete EventBridge schedules on event cancel:', scheduleErr);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully cancelled the event'
    });

  } catch (error) {
    console.error('Error in cancelEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
  try {
    const { eventId } = req.params;
    const { invitees, occurrenceDate, modifyType } = req.body;

    // Validate input parameters
    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return res.status(400).json({ message: 'Invalid invitees list' });
    }

    // Find and validate event
    const event = await findEventById(eventId, { populate: 'creator' });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate user permission (creator or accepted attendee)
    const isCreator = validateEventCreatorPermission(event, req.user._id);
    const isAcceptedAttendee = event.attendees.some(
      att => att.user.toString() === req.user._id.toString() && att.status === 'accepted'
    );

    if (!isCreator && !isAcceptedAttendee) {
      return res.status(403).json({ message: 'Not authorized to invite attendees' });
    }

    // Handle recurring event modifications
    if (isRecurringEvent(event) && occurrenceDate && modifyType) {
      if (modifyType === 'this_only') {
        // Create separate event for this occurrence with new invitees
        const newInvitees = invitees.map(userId => ({ user: userId, status: 'pending' }));
        const updatedAttendees = [...event.attendees, ...newInvitees];
        
        const separateEvent = await createSeparateOccurrenceEvent(
          event, 
          new Date(occurrenceDate), 
          { attendees: updatedAttendees }
        );

        // Synchronize attendees with new event
        await synchronizeAttendeesWithNewEvent(updatedAttendees, separateEvent._id);

        // Send invitation notifications using the separate event ID
        try {
          await createEventInvitationNotification(separateEvent._id, invitees);
        } catch (notificationError) {
          console.error('Error sending event invitation notifications for separate occurrence:', notificationError);
          // Don't fail the invitation if notification fails
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully invited attendees to this specific event occurrence',
          separateEventId: separateEvent._id,
          occurrenceDate: new Date(occurrenceDate),
          attendees: separateEvent.attendees
        });

      } else if (modifyType === 'all_future') {
        // Split event if necessary
        const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));

        for (const invitee of invitees) {
          // Update attendee status in master event
          await updateEventAttendee(futureEvent, invitee, 'pending');
        
          // Update user's event status
          await updateUserEventStatus(invitee, futureEvent?._id, 'pending');
        }

        // Send invitation notifications
        try {
          await createEventInvitationNotification(futureEvent?._id, invitees);
        } catch (notificationError) {
          console.error('Error sending event invitation notifications:', notificationError);
          // Don't fail the invitation if notification fails
        }

        return res.status(200).json({
          success: true,
          message: 'Successfully invited attendees to all future occurrences of this event',
          attendees: futureEvent.attendees
        });
      }
    }

    // Add event to new invitees' events list
    for (const invitee of invitees) {
      // Update attendee status in master event
      await updateEventAttendee(eventId, invitee, 'pending');
    
      // Update user's event status
      await updateUserEventStatus(invitee, eventId, 'pending');
    }

    // Send invitation notifications
    try {
      await createEventInvitationNotification(eventId, invitees);
    } catch (notificationError) {
      console.error('Error sending event invitation notifications:', notificationError);
      // Don't fail the invitation if notification fails
    }

    const updatedEvent = await Events.findById(eventId).populate('attendees.user');

    return res.status(200).json({
      success: true,
      message: 'Invitations sent successfully',
      attendees: updatedEvent.attendees
    });

  } catch (error) {
    console.error('Error in inviteEventAttendees:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
    const { friends } = filterData;

    // Build event filter using utility
    const eventFilter = buildEventFilter(filterData, { 
      category,
      includePrivateFriends: true,
      includeSelected: true,
      userId: req.user._id
    });

    // Get standard populate configuration and find events
    const populateConfig = getEventWithCreatorAndAttendeesPopulate();
    const events = await Events.find(eventFilter).populate(populateConfig).lean();

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Add user-specific fields using utility
    const eventsWithUserStatus = enrichEventsWithUserData(processedEvents, req.user._id, friends);

    res.status(200).json(eventsWithUserStatus);
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
    const { friends } = filterData;

    // Build event filter using utility
    const eventFilter = buildEventFilter(filterData, { 
      city,
      includePrivateFriends: true,
      includeSelected: true,
      userId: req.user._id
    });

    // Get standard populate configuration and find events
    const populateConfig = getEventWithCreatorAndAttendeesPopulate();
    const events = await Events.find(eventFilter).populate(populateConfig).lean();

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Add user-specific fields using utility
    const eventsWithUserStatus = enrichEventsWithUserData(processedEvents, req.user._id, friends);

    return res.status(200).json(eventsWithUserStatus);
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
    const populateConfig = getStandardEventPopulateConfig();
    const user = await User.findById(req.user._id)
      .populate(populateConfig)
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

    res.status(200).json({ 
      events: result.events,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error in getAttentionRequiredEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRecommendedEvents = async (req, res) => {
  try {
    // Get user's preferences, friends, and exclusion lists
    const user = await User.findById(req.user._id)
      .select('favorite_activities location friends reported_events not_interested_events')
      .populate('friends', '_id');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    const friends = user.friends || [];
    const friendIds = friends.map(friend => friend._id);
    const userLocation = user.location?.coordinates || null;
    const userActivities = user.favorite_activities || [];

    // Base query for upcoming events that are either public or private from friends
    const baseQuery = await recommendedEventsBaseQuery(user, now, friendIds, userActivities);

    // Find matching events
    let events = await Events.find(baseQuery)
      .populate('creator', '_id full_name profile_picture')
      .populate('attendees.user', '_id full_name profile_picture')
      .lean() // Convert to plain objects
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

    // Sort by relevance score and limit to 10 events
    processedEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const recommendedEvents = processedEvents.slice(0, 10);

    res.status(200).json({ events: recommendedEvents });
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
      return res.status(200).json([]); // No friends, no events
    }

    // Get date ranges using utility
    const { now, oneYearFromNow } = getDateRanges();
    
    // Build custom query for friends events (complex visibility requirements)
    const baseQuery = await buildFriendsEventsBaseQuery(req.user._id, now, friends, filterData);
    const events = await Events.find(baseQuery)
    .populate(getEventWithCreatorAndAttendeesPopulate())
    .lean() // Convert to plain objects
    .sort({ start_time: 1 });

    // Process events for discovery - show only next occurrence of recurring events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: req.user._id
    });

    // Add user-specific fields using utility
    const eventsWithUserStatus = enrichEventsWithUserData(processedEvents, req.user._id, friends);

    res.json(eventsWithUserStatus);
  } catch (error) {
    console.error('Error in getFriendsEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinEvent = async (req, res) => {
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
    const event = await findEventById(eventId);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if this is a recurring event
    const recurring = isRecurringEvent(event);
    
    if (recurring && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      
      // First check if user is already an attendee in the main event
      const existingAttendeeIndex = findAttendeeIndex(event, req.user._id);
      let updatedAttendees;
      
      if (existingAttendeeIndex !== -1) {
        // User is already an attendee - update their status for this occurrence
        updatedAttendees = event.attendees.map((att, index) => 
          index === existingAttendeeIndex 
            ? { ...att.toObject(), status } 
            : att.toObject()
        );
      } else {
        // User is not an attendee - add them with the new status
        updatedAttendees = [...event.attendees, { user: req.user._id, status }];
      }
      
      // Create separate event for this occurrence
      const separateEvent = await createSeparateOccurrenceEvent(event, occurrenceDate, {
        attendees: updatedAttendees
      });
      
      // Synchronize all attendees with the new event
      await synchronizeAttendeesWithNewEvent(updatedAttendees, separateEvent._id);
      
      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} this specific event occurrence`,
        separateEventId: separateEvent._id,
        occurrenceDate: new Date(occurrenceDate),
        status
      });
      
    } else if (recurring && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));
      
      // Update event attendee in the future event
      await updateEventAttendee(futureEvent, req.user._id, status);

      // Update user's event status for the future event
      await updateUserEventStatus(req.user._id, futureEvent._id, status);
      
      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} all future occurrences of this event`,
        status
      });
      
    } else {
      // Handle non-recurring events or "all instances" for recurring events
      // Update event attendee using utility
      await updateEventAttendee(event, req.user._id, status);

      // Update user's event status using utility
      await updateUserEventStatus(req.user._id, eventId, status);

      // Create standardized response using utility
      const { response, statusCode } = createApiResponse(
        true, 
        `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} the event`,
        { status }
      );

      return res.status(statusCode).json(response);
    }
  } catch (error) {
    console.error('Error in joinEvent:', error);
    const errorMessage = error.message || 'Server error';
    return res.status(error.message === 'Event not found' ? 404 : 500).json({ message: errorMessage });
  }
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
    const { eventId } = req.params;
    const { occurrenceDate, modifyType, ...eventData } = req.body;
    
    // Find event using utility
    const event = await findEventById(eventId);

    // Validate creator permission using utility
    if (!validateEventCreatorPermission(event, req.user._id)) {
      return res.status(403).json({ message: 'Only the event creator can perform this action' });
    }

    // Store original attendees for comparison
    const originalAttendees = event.attendees || [];
    const newAttendees = eventData.attendees || [];

    // Get user's current attendance status using utility
    const userStatus = getUserAttendanceStatus(event, req.user._id);

    // Check if this is a recurring event using utility
    const recurring = isRecurringEvent(event);

    // Variables to track notification data after recurring event handling
    let finalEventId = eventId;
    let finalEvent = event;
    let shouldContinueWithNotifications = true;

    // Handle recurring event modifications
    if (recurring && occurrenceDate && modifyType) {
      let result;
      
      // Process attendee data to preserve existing responses for recurring events
      let processedEventData = { ...eventData };
      if (newAttendees && newAttendees.length > 0) {
        // Create a map of existing attendees with their current status
        const existingAttendeesMap = new Map();
        originalAttendees.forEach(attendee => {
          const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
          existingAttendeesMap.set(userId, attendee.status);
        });

        // Process new attendees list, preserving existing statuses
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
      
      if (modifyType === 'this_only') {
        result = await handleThisOccurrenceOnlyUpdate(event, occurrenceDate, processedEventData, userStatus);
        if (result && result.separateEvent) {
          finalEvent = result.separateEvent;
        }
      } 
      else if (modifyType === 'all_future') {
        result = await handleThisAndFutureUpdate(event, occurrenceDate, processedEventData, userStatus);
        if (result && result.futureEvent) {
          finalEvent = result.futureEvent;
        }
      }
      
      // Don't return early - continue with notification logic
    } else {
      // For non-recurring events, preserve existing attendee responses
      let updatedAttendees = [];
      
      if (newAttendees && newAttendees.length > 0) {
        // Create a map of existing attendees with their current status
        const existingAttendeesMap = new Map();
        originalAttendees.forEach(attendee => {
          const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
          existingAttendeesMap.set(userId, attendee.status);
        });

        // Process new attendees list, preserving existing statuses
        updatedAttendees = newAttendees.map(attendee => {
          const userId = attendee.user._id ? attendee.user._id.toString() : attendee.user.toString();
          const existingStatus = existingAttendeesMap.get(userId);
          
          return {
            user: attendee.user,
            status: existingStatus || attendee.status || 'pending'
          };
        });
      } else {
        // If no attendees provided, keep original attendees
        updatedAttendees = originalAttendees;
      }

      // Update event data while preserving attendee responses
      const sanitizedData = sanitizeEventUpdateData({
        ...eventData,
        attendees: updatedAttendees
      });
      
      Object.assign(event, sanitizedData);
      await event.save();
      finalEvent = event;
    }

    // Notification logic - works for both recurring and non-recurring events
    if (shouldContinueWithNotifications && newAttendees && newAttendees.length > 0) {
      // Find attendees who were already in the event (for update notifications)
      const originalAttendeeIds = originalAttendees.map(attendee => 
        attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
      );
      
      const newAttendeeIds = newAttendees.map(attendee => 
        attendee.user._id ? attendee.user._id.toString() : attendee.user.toString()
      );

      // Find new invitees (not in original list)
      const invitedAttendeeIds = newAttendeeIds.filter(id => !originalAttendeeIds.includes(id));
      
      // Find existing attendees who remain in the event (for update notifications)
      const remainingAttendeeIds = newAttendeeIds.filter(id => 
        originalAttendeeIds.includes(id) && id !== req.user._id.toString()
      );

      // Send invitation notifications to new attendees
      if (invitedAttendeeIds.length > 0) {
        try {
          await createEventInvitationNotification(finalEventId, invitedAttendeeIds);
        } catch (notificationError) {
          console.error('Error sending event invitation notifications:', notificationError);
          // Don't fail the update if notification fails
        }
      }

      // Send update notifications to existing attendees who remain in the event
      if (remainingAttendeeIds.length > 0) {
        try {
          await createEventUpdateNotification(finalEventId, req.user._id, remainingAttendeeIds);
        } catch (notificationError) {
          console.error('Error sending event update notifications:', notificationError);
          // Don't fail the update if notification fails
        }
      }
    } else if (shouldContinueWithNotifications) {
      // If no attendees specified, send update notifications to all existing attendees
      const existingAttendeeIds = originalAttendees
        .map(attendee => attendee.user._id ? attendee.user._id.toString() : attendee.user.toString())
        .filter(id => id !== req.user._id.toString());

      if (existingAttendeeIds.length > 0) {
        try {
          await createEventUpdateNotification(finalEventId, req.user._id, existingAttendeeIds);
        } catch (notificationError) {
          console.error('Error sending event update notifications:', notificationError);
          // Don't fail the update if notification fails
        }
      }
    }

    // Update / remove reminder schedules if needed
    try {
      const sanitizedData = sanitizeEventUpdateData(eventData);
      if (sanitizedData.status === 'cancelled') {
        await deleteSchedule(finalEventId, 'all');
      } else if (Object.prototype.hasOwnProperty.call(sanitizedData, 'start_time')) {
        // Delete old schedules first
        await deleteSchedule(finalEventId, 'all');
        
        // Create new schedules with updated time
        const eventStartTime = finalEvent.start_time.getTime();
        const now = new Date().getTime();
        
        // Schedule 1-hour reminder
        const oneHourBefore = new Date(eventStartTime - 60 * 60 * 1000);
        if (oneHourBefore.getTime() > now) {
          await putSchedule(finalEventId.toString(), oneHourBefore, '1hour');
        }
        
        // Schedule 10-minute reminder
        const tenMinsBefore = new Date(eventStartTime - 10 * 60 * 1000);
        if (tenMinsBefore.getTime() > now) {
          await putSchedule(finalEventId.toString(), tenMinsBefore, '10min');
        }
      }
    } catch (scheduleErr) {
      console.error('Failed to update EventBridge reminder schedules:', scheduleErr);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: finalEvent,
      ...(finalEventId !== eventId && { updatedEventId: finalEventId })
    });
  } catch (error) {
    console.error('Error in updateEvent:', error);
    const errorMessage = error.message || 'Server error';
    return res.status(error.message === 'Event not found' ? 404 : 
                     error.message === 'Only the event creator can perform this action' ? 403 : 500)
              .json({ message: errorMessage });
  }
};

const removeEventAttendee = async (req, res) => {
  try {
    const { eventId, attendeeId, occurrenceDate, modifyType } = req.body;
    
    // Validate input parameters using utility
    const validation = validateInputParams({ eventId, attendeeId }, ['eventId', 'attendeeId']);
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
    
    // Validate creator permission using utility
    if (!validateEventCreatorPermission(event, req.user._id)) {
      return res.status(403).json({ message: 'Only the event creator can perform this action' });
    }

    // Check if attendee exists in the event using utility
    const attendeeIndex = findAttendeeIndex(event, attendeeId);
    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'Attendee is not in this event' });
    }

    // Check if this is a recurring event using utility
    const recurring = isRecurringEvent(event);

    if (recurring && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      const updatedAttendees = createAttendeesListWithoutUser(event.attendees, attendeeId);
      
      // Create separate event with removed attendee
      const separateEvent = await createSeparateOccurrenceEvent(event, occurrenceDate, {
        attendees: updatedAttendees
      });

      // Synchronize all remaining attendees with the new event
      await synchronizeAttendeesWithNewEvent(updatedAttendees, separateEvent._id);

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from this specific event occurrence',
        separateEventId: separateEvent._id,
        occurrenceDate: new Date(occurrenceDate)
      });

    } else if (recurring && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));

      await Promise.all([
        removeAttendeeFromEventArray(futureEvent, attendeeId),
        removeUserFromEvent(attendeeId, futureEvent._id)
      ]);

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from all future occurrences of this event'
      });
    } else {
      // Handle non-recurring events or regular recurring event removals
      await Promise.all([
        removeAttendeeFromEventArray(event, attendeeId),
        removeUserFromEvent(attendeeId, eventId)
      ]);

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from the event'
      });
    }

  } catch (error) {
    console.error('Error in removeEventAttendee:', error);
    const errorMessage = error.message || 'Server error';
    return res.status(error.message === 'Event not found' ? 404 : 
                     error.message === 'Only the event creator can perform this action' ? 403 : 500)
              .json({ message: errorMessage });
  }
};

module.exports = {
  getMyEvents, // reviewed
  getUserEvents, // reviewed
  createEvent, // reviewed
  getMyPastEvents, // reviewed
  getMyUpcomingEvents, // reviewed
  getMyEventsCalendarMonthView, // reviewed
  getMyEventsForDateRange, // reviewed
  getEventById, // reviewed
  getNearbyEvents, // reviewed
  respondToEventInvitation, // reviewed
  cancelEvent, // reviewed
  deleteRecurringEvents, // reviewed
  inviteEventAttendees, // reviewed
  getEventsByCategory, // reviewed
  getEventsByCity, // reviewed
  getAttentionRequiredEvents, // reviewed
  getRecommendedEvents, // reviewed
  getFriendsEvents, // reviewed
  joinEvent, // reviewed
  markEventNotInterested, // reviewed
  reportEvent, // reviewed
  updateEvent, // reviewed
  removeEventAttendee // reviewed
};
