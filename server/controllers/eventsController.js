const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const EventOccurrence = require('../database/schemas/eventOccurenceSchema');
const { RRule } = require('rrule');
const { 
  createEventCreationNotificationForFriends,
  createEventUpdateNotification,
  createEventAttendanceNotification,
  createNearbyEventNotification
} = require('./notificationsController');
const {
  // Core utilities
  getUserFilterData,
  buildEventFilter,
  processEventsWithRecurrence,
  processEventsWithRecurrenceEnhanced,
  enrichEventsWithUserData,
  filterUserEvents,
  
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
  generateRecurringEventDates
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
    let processedAttendees = [...attendees];
    const creatorId = req.user._id.toString();
    const creatorIncluded = processedAttendees.some(
      att => att.user && att.user._id && att.user._id.toString() === creatorId
    );

    // If creator not included, add them
    if (!creatorIncluded) {
      processedAttendees.unshift({ user: { _id: creatorId } });
    }

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
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { events: { event: event._id, status: 'accepted' } }
    });

    // Add event to attendees' events lists with pending status
    const attendeeIds = attendees
      .map(({ user }) => user._id)
      .filter(id => id.toString() !== req.user._id.toString());

    if (attendeeIds.length > 0) {
      await User.updateMany(
        { _id: { $in: attendeeIds } },
        {
          $addToSet: {
            events: { event: event._id, status: 'pending' }
          }
        }
      );
    }

    // Add to friends' friend_event_history
    const creator = await User.findById(req.user._id).select('friends');
    for (const friendId of creator.friends) {
      const updated = await User.updateOne(
        { _id: friendId, 'friend_event_history.friend': req.user._id },
        {
          $addToSet: {
            'friend_event_history.$.events': {
              event: event._id,
              added_at: new Date()
            }
          }
        }
      );

      if (updated.matchedCount === 0) {
        await User.updateOne(
          { _id: friendId },
          {
            $addToSet: {
              friend_event_history: {
                friend: req.user._id,
                events: [{ event: event._id, added_at: new Date() }]
              }
            }
          }
        );
      }
    }

    // Send notifications to friends for public events only
    if (visibility === 'public' && creator.friends.length > 0) {
      try {
        const notifications = await createEventCreationNotificationForFriends(event._id, req.user._id, creator.friends);
      } catch (notificationError) {
        console.error('Error sending event creation notifications:', notificationError);
        // Don't fail the event creation if notifications fail
      }
    }

    // Send nearby event notifications for public events
    if (visibility === 'public' && location?.coordinates?.lat && location?.coordinates?.lng) {
      try {
        // Find users within 50 miles (will implement this function)
        const nearbyUserIds = await findUsersWithin50Miles(location.coordinates.lat, location.coordinates.lng, req.user._id);
        if (nearbyUserIds.length > 0) {
          const nearbyNotifications = await createNearbyEventNotification(event._id, nearbyUserIds);
        }
      } catch (notificationError) {
        console.error('Error sending nearby event notifications:', notificationError);
        // Don't fail the event creation if notifications fail
      }
    }

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

    // Get the list of reported event IDs
    const reportedEventIds = (user.reported_events || []).map(event => 
      event.toString()
    );
    
    // Get the list of not interested event IDs
    const notInterestedEventIds = (user.not_interested_events || []).map(item => 
      item.event.toString()
    );

    const allUserEvents = (user.events || [])
      .filter(e => 
        e.event && 
        !reportedEventIds.includes(e.event._id.toString()) && // Filter out reported events
        !notInterestedEventIds.includes(e.event._id.toString()) // Filter out not interested events
      )
      .map(e => ({
        ...e.event.toObject(),
        userStatus: e.status // Include the user's response status
      }));

    const allEvents = [];

    // Process each event
    for (const event of allUserEvents) {
      const eventDate = new Date(event.start_time);
      const recurrence = event.recurrence || {};
      const isRecurring = recurrence.checked && recurrence.frequency && recurrence.frequency !== 'none';

      if (!isRecurring) {
        // Non-recurring event - check if it falls within the date range
        if (eventDate >= startDate && eventDate <= endDate) {
          allEvents.push(event);
        }
      } else {
        // Recurring event - generate occurrences and filter by excludedDates
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        const recurrenceEndDate = event.recurrence.end_date 
          ? new Date(event.recurrence.end_date) 
          : endDate;

        // Skip if recurrence has already ended
        if (recurrenceEndDate < startDate) continue;

        // Generate occurrences using RRule
        const freqMapping = {
          daily: RRule.DAILY,
          weekly: RRule.WEEKLY,
          monthly: RRule.MONTHLY,
          yearly: RRule.YEARLY
        };

        const ruleOptions = {
          freq: freqMapping[event.recurrence.frequency.toLowerCase()],
          dtstart: eventStartTime,
          until: recurrenceEndDate
        };

        const rule = new RRule(ruleOptions);
        const occurrences = rule.between(startDate, endDate, true);

        // Filter out excluded dates and add valid occurrences
        for (const occurrenceDate of occurrences) {
          // Check if this date is in excludedDates
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration and apply it to the occurrence
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            // Create event object for this occurrence
            const eventOccurrence = {
              ...event,
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`, // Unique ID for this occurrence
              originalEventId: event._id, // Keep reference to original event
              isRecurringOccurrence: true
            };

            allEvents.push(eventOccurrence);
          }
        }
      }
    }

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
    const filteredEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe']);

    // Process events with recurrence using utility
    const { now, oneYearFromNow } = getDateRanges();
    const allUpcomingOccurrences = processEventsWithRecurrence(filteredEvents, now, oneYearFromNow);

    // Apply home screen limits and get metadata
    const result = applyHomeScreenLimits(allUpcomingOccurrences, fromHomeScreen, 3);

    if (result.events.length === 0) {
      return res.status(201).json({ message: 'No events found', events: [] });
    }

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

    // Filter for accepted past events using custom logic for past events
    const pastEvents = (user.events || []).filter(e => {
      const isAccepted = e.status === 'accepted';
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

    // Filter user events using utility
    const relevantEvents = filterUserEvents(user.events, reportedEventIds, notInterestedEventIds, ['accepted', 'maybe']);

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
      att.user._id.toString() === req.user._id.toString()
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

    res.status(201).json({ found_event: eventWithUserStatus });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}

const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, distance } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchDistance = parseFloat(distance) || 50; // Default to 50 miles if not provided
    
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

    // Process events with recurrence using utility, excluding user attending events
    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now
    
    const processedEvents = processEventsWithRecurrence(events, now, futureLimit, { 
      excludeUserAttending: true, 
      userId: req.user._id 
    });

    // Calculate distances and filter nearby events using utility
    const nearbyEvents = calculateEventsDistance(processedEvents, userLat, userLng, searchDistance);

    res.status(200).json({
      events: nearbyEvents.map(item => ({
        ...item.event,
        distance: item.distance
      }))
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
        // Update attendee status in master event
        await updateEventAttendee(event, req.user._id, status);
        
        // Update user's event status
        await updateUserEventStatus(req.user._id, eventId, status);

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

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully cancelled this specific event occurrence',
          cancelledDate: new Date(occurrenceDate)
        });

      } else if (modifyType === 'all_future') {
        // Set recurrence end date to stop future occurrences
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        event.recurrence.end_date = today;
        await event.save();

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully cancelled all future occurrences of this event'
        });
      }
    }

    // Handle non-recurring events or cancel entire recurring series
    event.status = 'cancelled';
    await event.save();

    // Remove event from all users' events lists
    await User.updateMany(
      { 'events.event': eventId },
      { $pull: { events: { event: eventId } } }
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully cancelled the event'
    });

  } catch (error) {
    console.error('Error in cancelEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
    const { invitees, occurrenceDate, modifyType, inviteToAllOccurrences } = req.body;

    // Validate input parameters
    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return res.status(400).json({ message: 'Invalid invitees list' });
    }

    // Find and validate event
    const event = await findEventById(eventId, { populate: 'creator' });

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

        // Add excluded date to master event
        await addExcludedDate(event, new Date(occurrenceDate));

        // Synchronize attendees with new event
        await synchronizeAttendeesWithNewEvent(updatedAttendees, separateEvent._id);

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully invited attendees to this specific event occurrence',
          separateEventId: separateEvent._id,
          occurrenceDate: new Date(occurrenceDate),
          attendees: separateEvent.attendees
        });

      } else if (modifyType === 'all_future') {
        // Add invitees to the master event for all future occurrences
        const updatedEvent = await Events.findByIdAndUpdate(
          eventId,
          {
            $addToSet: {
              attendees: {
                $each: invitees.map(userId => ({ user: userId, status: 'pending' }))
              }
            }
          },
          { new: true }
        ).populate('attendees.user');

        // Add event to new invitees' events list
        await User.updateMany(
          { _id: { $in: invitees } },
          {
            $addToSet: {
              events: { event: eventId, status: 'pending' }
            }
          }
        );

        return res.status(200).json({
          success: true,
          message: 'Successfully invited attendees to all future occurrences of this event',
          attendees: updatedEvent.attendees
        });
      }
    }

    // Handle non-recurring events or legacy parameter
    if (inviteToAllOccurrences && event.recurrence?.checked) {
      console.warn('Using deprecated inviteToAllOccurrences parameter. Please use modifyType instead.');
    }

    // Add invitees to the main event
    const updatedEvent = await Events.findByIdAndUpdate(
      eventId,
      {
        $addToSet: {
          attendees: {
            $each: invitees.map(userId => ({ user: userId, status: 'pending' }))
          }
        }
      },
      { new: true }
    ).populate('attendees.user');

    // Add event to invitees' events list
    await User.updateMany(
      { _id: { $in: invitees } },
      {
        $addToSet: {
          events: { event: eventId, status: 'pending' }
        }
      }
    );

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
    const events = await Events.find(eventFilter).populate(populateConfig);

    // Process events with recurrence using utility
    const { now, oneYearFromNow } = getDateRanges();
    const processedEvents = processEventsWithRecurrence(events, now, oneYearFromNow);

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
    const events = await Events.find(eventFilter).populate(populateConfig);

    // Process events with recurrence using utility
    const { now, oneYearFromNow } = getDateRanges();
    const processedEvents = processEventsWithRecurrence(events, now, oneYearFromNow);

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
    const attentionEvents = (user.events || [])
      .filter(userEvent => {
        // Make sure the event exists and hasn't been cancelled
        if (!userEvent.event || userEvent.event.status === 'cancelled') {
          return false;
        }
        
        // Filter out reported events and not interested events
        if (reportedEventIds.includes(userEvent.event._id.toString()) || 
            notInterestedEventIds.includes(userEvent.event._id.toString())) {
          return false;
        }

        // Check if the event is in the future or ongoing
        const eventEndTime = new Date(userEvent.event.end_time);
        if (eventEndTime < now) {
          return false;
        }

        // Include if status is pending (undefined, null, or explicitly 'pending') or rejected
        return (
          userEvent.status === undefined ||
          userEvent.status === null ||
          userEvent.status === 'pending' ||
          userEvent.status === 'rejected'
        );
      })
      .map(userEvent => ({
        ...userEvent.event.toObject(),
        userStatus: userEvent.status || 'pending' // Normalize undefined/null to 'pending'
      }));

    // Process events with recurrence using utility - limit to 30 days for attention required
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const processedEvents = processEventsWithRecurrence(attentionEvents, now, thirtyDaysFromNow);

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
    const userActivities = user.favorite_activities || [];
    const userLocation = user.location?.coordinates || null;
    const reportedEventIds = (user.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user.not_interested_events || []).map(item => item.event.toString());

    // Base query for upcoming events that are either public or private from friends
    const baseQuery = {
      status: { $ne: 'cancelled' },
      end_time: { $gte: now },
      $and: [
        {
          $or: [
            { visibility: 'public' },
            { visibility: 'private', creator: { $in: friendIds } }
          ]
        },
        // Exclude events user is already attending
        {
          'attendees.user': { $ne: req.user._id }
        },
        // Exclude reported events
        {
          _id: { $nin: reportedEventIds }
        },
        // Exclude not interested events
        {
          _id: { $nin: notInterestedEventIds }
        }
      ]
    };

    // Add category matching if user has favorite activities
    if (userActivities.length > 0) {
      baseQuery.category = { $in: userActivities };
    }

    // Find matching events
    let events = await Events.find(baseQuery)
      .populate('creator', '_id full_name profile_picture')
      .populate('attendees.user', '_id full_name profile_picture')
      .sort({ start_time: 1 });

    // Process events to calculate relevance scores
    const processedEvents = events.map(event => {
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
        ...event.toObject(),
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
    const events = await Events.find({
      status: { $ne: 'cancelled' },
      end_time: { $gte: now },
      _id: { $nin: [...filterData.reportedEventIds, ...filterData.notInterestedEventIds] },
      $and: [
        {
          $or: [
            // Public events created by friends
            { 
              visibility: 'public',
              creator: { $in: friends }
            },
            // Private events created by friends
            { 
              visibility: 'private',
              creator: { $in: friends },
            },
            // Selected events created by friends if user is invited
            {
              visibility: 'selected',
              creator: { $in: friends },
              'attendees.user': req.user._id
            }
          ]
        }
      ]
    })
    .populate(getEventWithCreatorAndAttendeesPopulate())
    .sort({ start_time: 1 });

    // Process events with recurrence using enhanced utility
    const processedEvents = processEventsWithRecurrenceEnhanced(events, now, oneYearFromNow);

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
    const { eventId, status } = req.body;
    
    // Validate input parameters using utility
    const validation = validateInputParams({ eventId, status }, ['eventId', 'status'], [commonValidations.eventStatus]);
    if (!validation.isValid) {
      return res.status(400).json({ 
        message: `Missing parameters: ${validation.missing.join(', ')}${validation.invalid.length ? `. Invalid: ${validation.invalid.map(i => i.message).join(', ')}` : ''}` 
      });
    }

    if (!['accepted', 'maybe'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted or maybe' });
    }

    // Find event using utility
    const event = await findEventById(eventId);

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

    // Add to user's not interested list using utility
    await addUserNotInterestedEvent(req.user._id, eventId);

    // Remove user from event attendees using utility
    await removeAttendeeFromEvent(event, req.user._id);

    // Remove event from user's events list using utility
    await removeUserEvent(req.user._id, eventId);

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
    const event = await Events.findById(eventId).populate('creator');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validate that the user isn't reporting their own event
    if (event.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot report your own event' });
    }

    // Check if user has already reported this event
    const reporter = await User.findById(req.user._id);
    const existingReport = reporter.event_reports.find(
      report => report.event.toString() === eventId
    );

    if (existingReport) {
      return res.status(400).json({ message: 'You have already reported this event' });
    }

    // Add report to reporter's event_reports list
    reporter.event_reports.push({
      event: eventId,
      event_creator: event.creator._id,
      reason: reason || 'other',
      details: details || null,
      created_at: new Date(),
      status: 'pending'
    });

    await reporter.save();

    // Add report to event creator's event_reports_against_me list
    const eventCreator = await User.findById(event.creator._id);
    eventCreator.event_reports_against_me.push({
      event: eventId,
      reason: reason || 'other',
      details: details || null,
      created_at: new Date(),
      status: 'pending',
      reporter: req.user._id
    });

    await eventCreator.save();

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

    // Get user's current attendance status using utility
    const userStatus = getUserAttendanceStatus(event, req.user._id);

    // Check if this is a recurring event using utility
    const recurring = isRecurringEvent(event);

    // Handle recurring event modifications
    if (recurring && occurrenceDate && modifyType) {
      let result;
      
      if (modifyType === 'this_only') {
        result = await handleThisOccurrenceOnlyUpdate(event, occurrenceDate, eventData, userStatus);
      } 
      else if (modifyType === 'this_and_future') {
        result = await handleThisAndFutureUpdate(event, occurrenceDate, eventData, userStatus);
      }
      else if (modifyType === 'all_instances') {
        result = await handleAllInstancesUpdate(event, eventData, eventId, req.user._id);
      }
      
      if (result) {
        return res.status(200).json(result);
      }
    }
    
    // For non-recurring events, simply update
    const sanitizedData = sanitizeEventUpdateData(eventData);
    Object.assign(event, sanitizedData);
    await event.save();

    // Send update notifications to all attendees
    const attendeeIds = event.attendees.map(attendee => attendee.user);
    await sendEventUpdateNotifications(eventId, req.user._id, attendeeIds);
    
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
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
      await removeAttendeeFromEventArray(event, attendeeId);
      await removeUserFromEvent(attendeeId, eventId);

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from all future occurrences of this event'
      });
    } else {
      // Handle non-recurring events or regular recurring event removals
      await removeAttendeeFromEventArray(event, attendeeId);
      await removeUserFromEvent(attendeeId, eventId);

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
  getMyEvents,
  getUserEvents,
  createEvent,
  getMyPastEvents,
  getMyUpcomingEvents,
  getMyEventsCalendarMonthView,
  getMyEventsForDateRange,
  getEventById,
  getNearbyEvents,
  respondToEventInvitation,
  cancelEvent,
  deleteRecurringEvents,
  inviteEventAttendees,
  getEventsByCategory,
  getEventsByCity,
  getAttentionRequiredEvents,
  getRecommendedEvents,
  getFriendsEvents,
  joinEvent,
  markEventNotInterested,
  reportEvent,
  updateEvent,
  removeEventAttendee
};
