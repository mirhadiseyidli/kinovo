const { RRule } = require('rrule');
const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const { createEventUpdateNotification } = require('../controllers/notificationsController');

// Global helper: build a stable occurrence ID (baseId-yyyy-MM-dd)
const buildOccurrenceId = (baseId, date) => {
  const yyyyMmDd = date.toISOString().split('T')[0];
  return `${baseId}-${yyyyMmDd}`;
};

/**
 * Get user's filtered event lists (reported, not interested, friends)
 * @param {string} userId - User ID
 * @returns {Object} Object containing reportedEventIds, notInterestedEventIds, friends
 */
const getUserFilterData = async (userId) => {
  const user = await User.findById(userId).select('reported_events not_interested_events friends');
  
  const reportedEventIds = (user?.reported_events || []).map(event => event.toString());
  const notInterestedEventIds = (user?.not_interested_events || []).map(item => item.event.toString());
  const friends = user?.friends || [];
  
  return { reportedEventIds, notInterestedEventIds, friends, user };
};

/**
 * Create MongoDB filter for events based on user context
 * @param {Object} filterData - User filter data from getUserFilterData
 * @param {Object} options - Additional filter options
 * @returns {Object} MongoDB filter object
 */
const buildEventFilter = (filterData, options = {}) => {
  const {
    category,
    city,
    includePrivateFriends = false,
    includeSelected = false,
    userId,
    startDate,
    endDate,
    excludeUserEvents = false
  } = options;

  const baseFilter = {
    status: { $ne: 'cancelled' },
    _id: { 
      $nin: [...filterData.reportedEventIds, ...filterData.notInterestedEventIds] 
    }
  };

  // Add date filters if provided
  if (startDate) baseFilter.start_time = { $gte: startDate };
  if (endDate) baseFilter.end_time = { $lte: endDate };
  if (startDate && endDate) {
    baseFilter.$or = [
      { start_time: { $gte: startDate, $lte: endDate } },
      { end_time: { $gte: startDate, $lte: endDate } }
    ];
  }

  // Add category filter
  if (category) baseFilter.category = category;
  
  // Add city filter
  if (city) baseFilter.city = city;

  // Build visibility rules
  const visibilityRules = [{ visibility: 'public' }];
  
  if (includePrivateFriends && filterData.friends?.length > 0) {
    visibilityRules.push({
      visibility: 'private',
      creator: { $in: filterData.friends }
    });
  }
  
  if (includeSelected && userId) {
    visibilityRules.push({
      visibility: 'selected',
      'attendees.user': userId
    });
  }

  baseFilter.$and = [{ $or: visibilityRules }];

  // Exclude events user is already attending
  if (excludeUserEvents && userId) {
    baseFilter.$and.push({
      'attendees.user': { $ne: userId }
    });
  }

  return baseFilter;
};

/**
 * Map frequency string to RRule frequency constant
 * @param {string} frequency - Frequency string (daily, weekly, monthly, yearly)
 * @returns {number} RRule frequency constant
 */
const getFrequencyMapping = (frequency) => {
  const freqMapping = {
    daily: RRule.DAILY,
    weekly: RRule.WEEKLY,
    monthly: RRule.MONTHLY,
    yearly: RRule.YEARLY
  };
  return freqMapping[frequency.toLowerCase()] || RRule.WEEKLY;
};

/**
 * Check if a date is excluded from an event
 * @param {Date} date - Date to check
 * @param {Array} excludedDates - Array of excluded dates
 * @returns {boolean} True if date is excluded
 */
const isDateExcluded = (date, excludedDates) => {
  if (!excludedDates || excludedDates.length === 0) return false;
  
  return excludedDates.some(excludedDate => 
    new Date(excludedDate).toDateString() === date.toDateString()
  );
};

/**
 * Generate recurring event occurrences
 * @param {Object} event - Event object
 * @param {Date} startRange - Start of date range
 * @param {Date} endRange - End of date range
 * @returns {Array} Array of event occurrences
 */
const generateRecurringOccurrences = (event, startRange, endRange) => {
  const eventStartTime = new Date(event.start_time);
  const eventEndTime = new Date(event.end_time);
  const recurrenceEndDate = event.recurrence.end_date 
    ? new Date(event.recurrence.end_date) 
    : endRange;

  // Skip if recurrence has already ended
  if (recurrenceEndDate < startRange) return [];

  // Generate occurrences using RRule
  const ruleOptions = {
    freq: getFrequencyMapping(event.recurrence.frequency),
    dtstart: eventStartTime,
    until: recurrenceEndDate
  };

  const rule = new RRule(ruleOptions);
  const occurrences = rule.between(startRange, endRange, true);
  
  const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
  const occurrenceEvents = [];

  for (const occurrenceDate of occurrences) {
    // Skip if this date is excluded
    if (isDateExcluded(occurrenceDate, event.excludedDates)) {
      continue;
    }

    const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

    occurrenceEvents.push({
      ...(event.toObject ? event.toObject() : event),
      start_time: occurrenceDate,
      end_time: occurrenceEndTime,
      _id: buildOccurrenceId(event._id, occurrenceDate),
      originalEventId: event._id,
      isRecurringOccurrence: true,
      userStatus: event.userStatus // Preserve userStatus if it exists
    });
  }

  return occurrenceEvents;
};

/**
 * Process events to handle recurring events and generate occurrences
 * @param {Array} events - Array of events
 * @param {Date} startRange - Start of date range (default: now)
 * @param {Date} endRange - End of date range (default: 1 year from now)
 * @param {Object} options - Processing options
 * @returns {Array} Processed events with recurring occurrences
 */
const processEventsWithRecurrence = (events, startRange = null, endRange = null, options = {}) => {
  const now = new Date();
  const defaultEndRange = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
  
  const start = startRange || now;
  const end = endRange || defaultEndRange;
  const { excludeUserAttending = false, userId = null } = options;

  const processedEvents = [];

  for (const event of events) {
    // Skip if user is attending and we want to exclude those
    if (excludeUserAttending && userId) {
      const isUserAttending = event.attendees?.some(a => a.user.toString() === userId.toString());
      if (isUserAttending) continue;
    }

    const isRecurring = event.recurrence?.checked &&
                       event.recurrence?.frequency &&
                       event.recurrence?.frequency !== 'none';

    if (isRecurring) {
      // To catch live recurring events, we generate occurrences from a recent past date
      // and then filter to keep only those that haven't ended yet.
      // We look back 7 days to reasonably catch events that might still be ongoing.
      const lookBehindStartDate = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const allPossibleOccurrences = generateRecurringOccurrences(event, lookBehindStartDate, end);
      
      const upcomingAndLiveOccurrences = allPossibleOccurrences.filter(occurrence => {
        const occurrenceEnd = new Date(occurrence.end_time);
        return occurrenceEnd >= start;
      });
      
      processedEvents.push(...upcomingAndLiveOccurrences);
    } else {
      // For non-recurring events, check if they haven't ended
      const eventEnd = new Date(event.end_time);
      if (eventEnd >= start) {
        const eventObj = event.toObject ? event.toObject() : event;
        processedEvents.push({
          ...eventObj,
          isRecurringOccurrence: false,
          userStatus: event.userStatus // Preserve userStatus if it exists
        });
      }
    }
  }

  // Sort events by start time
  processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return processedEvents;
};

/**
 * Add user-specific fields to events
 * @param {Array} events - Array of events
 * @param {string} userId - Current user ID
 * @param {Array} friends - User's friends array
 * @returns {Array} Events with user-specific fields added
 */
const enrichEventsWithUserData = (events, userId, friends = []) => {
  return events.map(event => {
    try {
      // Defensive check for event structure
      if (!event || !userId) {
        console.warn('Invalid event or userId in enrichEventsWithUserData:', { eventId: event?._id, userId });
        return {
          ...event,
          isUserAttending: false,
          isUserInvited: false,
          isUserCreator: false,
          isFriendEvent: false,
          userStatus: null
        };
      }

      // Ensure we're working with a plain object (convert Mongoose doc if needed)
      const eventObj = event.toObject ? event.toObject() : event;

      // Safe attendee lookup with comprehensive null checks
      const userAttendee = eventObj.attendees?.find(att => {
        // Check if attendee and user exist
        if (!att || !att.user) {
          return false;
        }
        
        try {
          // Handle both populated and non-populated user references
          const attendeeUserId = att.user._id?.toString() || att.user.toString?.();
          return attendeeUserId === userId.toString();
        } catch (err) {
          console.warn('Error processing attendee in enrichEventsWithUserData:', { 
            eventId: eventObj._id, 
            attendeeUser: att.user,
            error: err.message 
          });
          return false;
        }
      });
      
      // Safe creator lookup with null checks
      let creatorId = '';
      let isCreator = false;
      
      if (eventObj.creator) {
        try {
          creatorId = eventObj.creator._id?.toString() || eventObj.creator.toString?.() || '';
          isCreator = creatorId === userId.toString();
        } catch (err) {
          console.warn('Error processing creator in enrichEventsWithUserData:', { 
            eventId: eventObj._id, 
            creator: eventObj.creator,
            error: err.message 
          });
        }
      }
      
      // Safe friends check
      const isFriendEvent = friends.some(friendId => {
        try {
          return friendId.toString() === creatorId;
        } catch (err) {
          return false;
        }
      });

      return {
        ...eventObj,
        isUserAttending: !!userAttendee,
        isUserInvited: !!userAttendee,
        isUserCreator: isCreator,
        isFriendEvent: isFriendEvent,
        userStatus: userAttendee?.status || null
      };
      
    } catch (error) {
      // Catch-all error handler to prevent crashes
      console.error('Error in enrichEventsWithUserData:', {
        error: error.message,
        eventId: event?._id,
        userId,
        stack: error.stack
      });
      
      // Convert to plain object for safety and return with defaults
      const eventObj = event?.toObject ? event.toObject() : event || {};
      return {
        ...eventObj,
        isUserAttending: false,
        isUserInvited: false,
        isUserCreator: false,
        isFriendEvent: false,
        userStatus: null
      };
    }
  });
};

/**
 * Filter user events by status and exclusions
 * @param {Array} userEvents - User's events array
 * @param {Array} reportedEventIds - IDs of reported events
 * @param {Array} notInterestedEventIds - IDs of not interested events
 * @param {Array} allowedStatuses - Allowed event statuses (default: ['accepted', 'maybe'])
 * @returns {Array} Filtered events with user status
 */
const filterUserEvents = (userEvents, reportedEventIds, notInterestedEventIds, allowedStatuses = ['accepted', 'maybe']) => {
  return (userEvents || [])
    .filter(userEvent => {
      if (!userEvent.event) return false;
      
      const eventId = userEvent.event._id.toString();
      const isReported = reportedEventIds.includes(eventId);
      const isNotInterested = notInterestedEventIds.includes(eventId);
      const hasAllowedStatus = allowedStatuses.includes(userEvent.status);
      
      return hasAllowedStatus && !isReported && !isNotInterested;
    })
    .map(userEvent => ({
      ...userEvent.event.toObject(),
      userStatus: userEvent.status
    }));
};

/**
 * Create a separate event occurrence for recurring event modifications
 * @param {Object} originalEvent - Original recurring event
 * @param {Date} occurrenceDate - Specific occurrence date
 * @param {Object} updateData - Data to update (optional)
 * @returns {Object} Event data for creating separate occurrence
 */
const createSeparateOccurrenceData = (originalEvent, occurrenceDate, updateData = {}) => {
  const occurrenceStartDate = new Date(occurrenceDate);
  const originalStartDate = new Date(originalEvent.start_time);
  const originalEndDate = new Date(originalEvent.end_time);
  
  // Calculate the duration and apply it to the occurrence
  const duration = originalEndDate.getTime() - originalStartDate.getTime();
  const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);

  return {
    creator: originalEvent.creator,
    event_picture: updateData.event_picture || originalEvent.event_picture,
    title: updateData.title || originalEvent.title,
    category: updateData.category || originalEvent.category,
    description: updateData.description || originalEvent.description,
    location: updateData.location || originalEvent.location,
    start_time: occurrenceStartDate,
    end_time: occurrenceEndDate,
    capacity: updateData.capacity !== undefined ? updateData.capacity : originalEvent.capacity,
    recurrence: { checked: false, frequency: null, end_date: null }, // Make it non-recurring
    attendees: updateData.attendees || originalEvent.attendees,
    visibility: updateData.visibility || originalEvent.visibility,
    excludedDates: [], // Single events don't need excludedDates
    status: 'upcoming'
  };
};

/**
 * Add excluded date to recurring event
 * @param {Object} event - Event to update
 * @param {Date} dateToExclude - Date to add to excluded dates
 * @returns {Promise} Updated event
 */
const addExcludedDate = async (event, dateToExclude) => {
  if (!event.excludedDates.some(date => 
    new Date(date).toDateString() === dateToExclude.toDateString()
  )) {
    event.excludedDates.push(dateToExclude);
    await event.save();
  }
  return event;
};

/**
 * Find an attendee index in an event's attendees array
 * @param {Object} event - Event object
 * @param {string} userId - User ID to find
 * @returns {number} Index of attendee or -1 if not found
 */
const findAttendeeIndex = (event, userId) => {
  return event.attendees.findIndex(
    attendee => attendee.user.toString() === userId.toString()
  );
};

/**
 * Find a user event index in user's events array
 * @param {Object} user - User object
 * @param {string} eventId - Event ID to find
 * @returns {number} Index of user event or -1 if not found
 */
const findUserEventIndex = (user, eventId) => {
  return user.events.findIndex(
    userEvent => userEvent.event.toString() === eventId.toString()
  );
};

/**
 * Find and validate event by ID
 * @param {string} eventId - Event ID
 * @param {Object} options - Options for population
 * @returns {Object} Event object or throws error
 */
const findEventById = async (eventId, options = {}) => {
  const { populate } = options;
  
  let query = Events.findById(eventId);
  if (populate) {
    query = query.populate(populate);
  }
  
  const event = await query;
  if (!event) {
    throw new Error('Event not found');
  }
  
  return event;
};

/**
 * Validate event permissions for a user
 * @param {Object} event - Event object
 * @param {string} userId - User ID
 * @param {string} permissionType - Type of permission ('edit', 'invite', 'attend')
 * @returns {boolean} True if user has permission
 */
const validateEventPermission = (event, userId, permissionType) => {
  const isCreator = event.creator.toString() === userId.toString();
  const attendeeIndex = findAttendeeIndex(event, userId);
  const isAttendee = attendeeIndex !== -1;
  
  switch (permissionType) {
    case 'edit':
    case 'cancel':
    case 'invite':
      return isCreator;
    case 'attend':
    case 'respond':
      return isAttendee;
    case 'view':
      return isCreator || isAttendee || event.visibility === 'public';
    default:
      return false;
  }
};

/**
 * Add or update attendee in event
 * @param {Object} event - Event object
 * @param {string} userId - User ID
 * @param {string} status - Attendee status
 * @returns {Object} Updated event
 */
const updateEventAttendee = async (event, userId, status) => {
  const attendeeIndex = findAttendeeIndex(event, userId);
  
  if (attendeeIndex !== -1) {
    // Update existing attendee
    event.attendees[attendeeIndex].status = status;
  } else {
    // Add new attendee
    event.attendees.push({
      user: userId,
      status
    });
  }
  
  await event.save();
  return event;
};

/**
 * Remove attendee from event
 * @param {Object} event - Event object
 * @param {string} userId - User ID
 * @returns {Object} Updated event
 */
const removeAttendeeFromEvent = async (event, userId) => {
  const attendeeIndex = findAttendeeIndex(event, userId);
  
  if (attendeeIndex !== -1) {
    event.attendees.splice(attendeeIndex, 1);
    await event.save();
  }
  
  return event;
};

/**
 * Update user's event status
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} status - Event status
 * @returns {Object} Updated user
 */
const updateUserEventStatus = async (userId, eventId, status) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const userEventIndex = findUserEventIndex(user, eventId);
  
  if (userEventIndex !== -1) {
    // Update existing event
    user.events[userEventIndex].status = status;
  } else {
    // Add new event
    user.events.push({ event: eventId, status });
  }
  
  await user.save();
  return user;
};

/**
 * Remove event from user's events list
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Object} Updated user
 */
const removeUserEvent = async (userId, eventId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const userEventIndex = findUserEventIndex(user, eventId);
  
  if (userEventIndex !== -1) {
    user.events.splice(userEventIndex, 1);
    await user.save();
  }
  
  return user;
};

/**
 * Add event to user's not interested list
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Object} Updated user
 */
const addUserNotInterestedEvent = async (userId, eventId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if already in not interested list
  const alreadyNotInterested = user.not_interested_events.some(
    item => item.event.toString() === eventId.toString()
  );
  
  if (!alreadyNotInterested) {
    user.not_interested_events.push({
      event: eventId,
      added_at: new Date()
    });
    await user.save();
  }
  
  return user;
};

/**
 * Handle recurring event modification patterns
 * @param {Object} event - Event object
 * @param {string} occurrenceDate - Date of specific occurrence
 * @param {string} modifyType - Type of modification ('this_only', 'all_future', 'all_instances')
 * @param {Object} modificatonData - Data for modification
 * @returns {Object} Result of modification
 */
const handleRecurringEventModification = async (event, occurrenceDate, modifyType, modificationData) => {
  const isRecurring = event.recurrence?.checked && 
                     event.recurrence?.frequency && 
                     event.recurrence?.frequency !== 'none';
  
  if (!isRecurring) {
    // Handle non-recurring event normally
    return { type: 'simple', event };
  }
  
  if (modifyType === 'this_only' && occurrenceDate) {
    // Create separate occurrence
    const separateEventData = createSeparateOccurrenceData(event, new Date(occurrenceDate), modificationData);
    const separateEvent = await Events.create(separateEventData);
    
    // Add excluded date to master event
    await addExcludedDate(event, new Date(occurrenceDate));
    
    return { 
      type: 'separate_occurrence', 
      separateEvent, 
      masterEvent: event,
      occurrenceDate: new Date(occurrenceDate)
    };
  }
  
  if (modifyType === 'all_future') {
    // Modify all future occurrences (update master event)
    return { type: 'all_future', event };
  }
  
  // Default to all instances
  return { type: 'all_instances', event };
};

/**
 * Validate common input parameters
 * @param {Object} params - Parameters to validate
 * @param {Array} required - Required parameter names
 * @returns {Object} Validation result
 */
const validateInputParams = (params, required) => {
  const missing = [];
  const invalid = [];
  
  for (const param of required) {
    if (!params[param]) {
      missing.push(param);
    }
  }
  
  // Specific validations
  if (params.status && !['accepted', 'maybe', 'rejected', 'pending'].includes(params.status)) {
    invalid.push({ param: 'status', message: 'Invalid status value' });
  }
  
  if (params.eventId && typeof params.eventId !== 'string') {
    invalid.push({ param: 'eventId', message: 'Event ID must be a string' });
  }
  
  return {
    isValid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid
  };
};

/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Standardized response object
 */
const createApiResponse = (success, message, data = null, statusCode = 200) => {
  const response = {
    success,
    message
  };
  
  if (data) {
    Object.assign(response, data);
  }
  
  return { response, statusCode };
};

/**
 * Handle event invitation or response workflow
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @param {string} status - Response status
 * @param {Object} options - Additional options (occurrenceDate, modifyType)
 * @returns {Object} Result of invitation/response
 */
const handleEventInvitationResponse = async (eventId, userId, status, options = {}) => {
  const { occurrenceDate, modifyType } = options;
  
  // Find and validate event
  const event = await findEventById(eventId);
  
  // Check if user is invited
  const attendeeIndex = findAttendeeIndex(event, userId);
  if (attendeeIndex === -1) {
    throw new Error('User is not invited to this event');
  }
  
  // Handle recurring modification if needed
  const modificationResult = await handleRecurringEventModification(
    event, 
    occurrenceDate, 
    modifyType, 
    { userStatus: status }
  );
  
  if (modificationResult.type === 'separate_occurrence') {
    // Update user's event list for separate occurrence
    await updateUserEventStatus(userId, modificationResult.separateEvent._id, status);
    
    return {
      type: 'separate_occurrence',
      eventId: modificationResult.separateEvent._id,
      occurrenceDate: modificationResult.occurrenceDate,
      status
    };
  } else {
    // Update attendee status in main event
    await updateEventAttendee(event, userId, status);
    
    // Update user's event status
    await updateUserEventStatus(userId, eventId, status);
    
    return {
      type: modificationResult.type,
      eventId,
      status
    };
  }
};

// =============================================================================
// USER DATA POPULATION UTILITIES
// =============================================================================

/**
 * Standard populate configuration for user events with full details
 */
const getStandardEventPopulateConfig = () => ({
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
});

/**
 * Standard populate configuration for events with creator and attendees
 */
const getEventWithCreatorAndAttendeesPopulate = () => [
  { path: 'creator', select: 'first_name last_name username full_name profile_picture' },
  { path: 'attendees.user', select: 'first_name last_name username full_name profile_picture' }
];

// =============================================================================
// INPUT VALIDATION UTILITIES
// =============================================================================

/**
 * Common validation functions
 */
const commonValidations = {
  eventStatus: (params) => {
    const validStatuses = ['accepted', 'maybe', 'rejected', 'pending'];
    if (params.status && !validStatuses.includes(params.status)) {
      return { valid: false, field: 'status', message: 'Invalid status' };
    }
    return { valid: true };
  },
  
  dateRange: (params) => {
    if (params.start && params.end) {
      const startDate = new Date(params.start);
      const endDate = new Date(params.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { valid: false, field: 'dates', message: 'Invalid date format' };
      }
      
      if (startDate > endDate) {
        return { valid: false, field: 'dates', message: 'Start date must be before end date' };
      }
    }
    return { valid: true };
  }
};

// =============================================================================
// EVENT CRUD UTILITIES
// =============================================================================

/**
 * Add event to user's reported events list
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} reason - Report reason
 * @param {string} details - Report details
 */
const addUserReportedEvent = async (userId, eventId, reason, details) => {
  await User.updateOne(
    { _id: userId },
    { 
      $addToSet: { 
        reported_events: {
          event: eventId,
          reason,
          details,
          timestamp: new Date()
        }
      }
    }
  );
};

// =============================================================================
// RESPONSE UTILITIES
// =============================================================================

// =============================================================================
// DATE AND TIME UTILITIES
// =============================================================================

/**
 * Get common date ranges
 */
const getDateRanges = () => {
  const now = new Date();
  
  return {
    now,
    tomorrow: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    oneWeekFromNow: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    oneMonthFromNow: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    oneYearFromNow: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    pastMonthStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    nextMonthEnd: new Date(now.getFullYear(), now.getMonth() + 2, 0)
  };
};

// =============================================================================
// HOME SCREEN UTILITIES
// =============================================================================

/**
 * Apply home screen limitations and add metadata
 * @param {Array} events - Events array
 * @param {boolean} fromHomeScreen - Whether request is from home screen
 * @param {number} limit - Limit for home screen results
 * @returns {Object} Events with metadata
 */
const applyHomeScreenLimits = (events, fromHomeScreen, limit = 3) => {
  const finalEvents = fromHomeScreen ? events.slice(0, limit) : events;
  
  return {
    events: finalEvents,
    metadata: {
      fromHomeScreen,
      totalAvailable: events.length,
      returned: finalEvents.length
    }
  };
};

// =============================================================================
// ENHANCED RECURRING EVENT PROCESSING
// =============================================================================

/**
 * Enhanced process events with recurrence including excluded dates
 * @param {Array} events - Array of events to process
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {boolean} includeExcluded - Whether to check excluded dates
 * @returns {Array} Processed events with recurring occurrences
 */
const processEventsWithRecurrenceEnhanced = (events, startDate, endDate, includeExcluded = true) => {
  const allEvents = [];
  
  for (const event of events) {
    const eventDate = new Date(event.start_time);
    const recurrence = event.recurrence || {};
    const isRecurring = recurrence.checked && recurrence.frequency && recurrence.frequency !== 'none';
    
    if (!isRecurring) {
      // Non-recurring event
      if (eventDate >= startDate && eventDate <= endDate) {
        allEvents.push(event);
      }
    } else {
      // Recurring event
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
      
      // Process each occurrence
      for (const occurrenceDate of occurrences) {
        // Check if this date is excluded
        const isExcluded = includeExcluded && event.excludedDates && event.excludedDates.some(excludedDate => 
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
            _id: buildOccurrenceId(event._id, occurrenceDate),
            originalEventId: event._id,
            isRecurringOccurrence: true
          };
          
          allEvents.push(eventOccurrence);
        }
      }
    }
  }
  
  // Sort by start time
  return allEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
};

// =============================================================================
// EVENT PERMISSION AND VALIDATION UTILITIES
// =============================================================================

/**
 * Validate that user is the event creator
 * @param {Object} event - Event document
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is the creator, false otherwise
 */
const validateEventCreatorPermission = (event, userId) => {
  return event.creator.toString() === userId.toString();
};

/**
 * Check if event is recurring
 * @param {Object} event - Event document
 * @returns {boolean} Whether event is recurring
 */
const isRecurringEvent = (event) => {
  return event.recurrence?.checked && 
         event.recurrence?.frequency && 
         event.recurrence?.frequency !== 'none';
};

/**
 * Sanitize event update data by removing protected fields
 * @param {Object} eventData - Event data to sanitize
 * @returns {Object} Sanitized event data
 */
const sanitizeEventUpdateData = (eventData) => {
  const sanitized = { ...eventData };
  delete sanitized._id;
  delete sanitized.creator;
  return sanitized;
};

/**
 * Find user's attendance status for an event
 * @param {Object} event - Event document
 * @param {string} userId - User ID
 * @returns {string} User's attendance status or 'accepted' as default
 */
const getUserAttendanceStatus = (event, userId) => {
  const userAttendee = event.attendees.find(
    attendee => attendee.user.toString() === userId.toString()
  );
  return userAttendee ? userAttendee.status : 'accepted';
};

// =============================================================================
// RECURRING EVENT MODIFICATION UTILITIES
// =============================================================================

/**
 * Create a separate event for "this occurrence only" modifications
 * @param {Object} originalEvent - Original recurring event
 * @param {Date} occurrenceDate - Date of the specific occurrence
 * @param {Object} modifications - Modifications to apply
 * @returns {Object} Created separate event
 */
const createSeparateOccurrenceEvent = async (originalEvent, occurrenceDate, modifications = {}) => {
  const occurrenceStartDate = new Date(occurrenceDate);
  const originalStartDate = new Date(originalEvent.start_time);
  const originalEndDate = new Date(originalEvent.end_time);
  
  // Calculate the duration and apply it to the occurrence
  const duration = originalEndDate.getTime() - originalStartDate.getTime();
  const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);
  
  // Merge original event data with modifications
  const eventData = {
    creator: originalEvent.creator,
    event_picture: modifications.event_picture || originalEvent.event_picture,
    title: modifications.title || originalEvent.title,
    category: modifications.category || originalEvent.category,
    description: modifications.description || originalEvent.description,
    location: modifications.location || originalEvent.location,
    start_time: occurrenceStartDate,
    end_time: modifications.end_time ? new Date(modifications.end_time) : occurrenceEndDate,
    capacity: modifications.capacity !== undefined ? modifications.capacity : originalEvent.capacity,
    recurrence: { checked: false, frequency: null, end_date: null }, // Make it non-recurring
    attendees: modifications.attendees || originalEvent.attendees,
    visibility: modifications.visibility || originalEvent.visibility,
    excludedDates: [], // Single events don't need excludedDates
    status: 'upcoming'
  };
  
  const separateEvent = await Events.create(eventData);
  
  // Add this date to the original event's excludedDates
  await addExcludedDate(originalEvent, occurrenceStartDate);
  
  return separateEvent;
};

/**
 * Split recurring event for "this and future" modifications
 * @param {Object} originalEvent - Original recurring event
 * @param {Date} splitDate - Date to split from
 * @param {Object} modifications - Modifications to apply to future events
 * @returns {Object} Created future event
 */
const splitRecurringEvent = async (originalEvent, splitDate, modifications = {}) => {
  const splitStartDate = new Date(splitDate);
  
  // Preserve original recurrence before making any modifications so we can
  // safely reuse it for the future event. Clone to avoid shared references.
  const originalRecurrenceClone = originalEvent.recurrence
    ? { ...originalEvent.recurrence }
    : { checked: false, frequency: 'none', end_date: null };

  // Update the original event's end date to the day before split
  const dayBefore = new Date(splitStartDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  
  originalEvent.recurrence.end_date = dayBefore;
  // After truncating the series, determine if the ORIGINAL event now has only
  // a single occurrence left. If so, convert it to a non-recurring event so
  // the client will treat it correctly.
  if (originalEvent.recurrence?.checked) {
    try {
      const until = dayBefore;
      const rruleOriginal = new RRule({
        freq: getFrequencyMapping(originalEvent.recurrence.frequency),
        dtstart: new Date(originalEvent.start_time),
        until
      });
      const secondOccurrenceOriginal = rruleOriginal.after(new Date(originalEvent.start_time), false);
      if (!secondOccurrenceOriginal) {
        originalEvent.recurrence = { checked: false, frequency: 'none', end_date: null };
      }
    } catch (err) {
      console.warn('splitRecurringEvent: failed original recurrence check', err);
    }
  }

  await originalEvent.save();
   
  // Create new recurring event for future occurrences
  // Determine if only one occurrence remains after the split in the FUTURE
  // side of the series. Use the preserved clone first, then any modifications.
  let futureRecurrence = modifications.recurrence || { ...originalRecurrenceClone };

  if (futureRecurrence?.checked) {
    try {
      const until = futureRecurrence.end_date 
        ? new Date(futureRecurrence.end_date)
        : splitStartDate;
      const rrule = new RRule({
        freq: getFrequencyMapping(futureRecurrence.frequency),
        dtstart: splitStartDate,
        until
      });
      const secondOccurrence = rrule.after(splitStartDate, false);
      if (!secondOccurrence) {
        // Only one instance from now on – make it non-recurring
        futureRecurrence = { checked: false, frequency: 'none', end_date: null };
      }
    } catch (err) {
      console.warn('splitRecurringEvent: failed recurrence check', err);
    }
  }

  const futureEventData = {
    creator: originalEvent.creator,
    event_picture: modifications.event_picture || originalEvent.event_picture,
    title: modifications.title || originalEvent.title,
    category: modifications.category || originalEvent.category,
    description: modifications.description || originalEvent.description,
    location: modifications.location || originalEvent.location,
    start_time: splitStartDate,
    end_time: modifications.end_time || originalEvent.end_time,
    capacity: modifications.capacity !== undefined ? modifications.capacity : originalEvent.capacity,
    recurrence: futureRecurrence,
    attendees: modifications.attendees || originalEvent.attendees,
    visibility: modifications.visibility || originalEvent.visibility,
    excludedDates: originalEvent.excludedDates ? [...originalEvent.excludedDates] : [],
    status: 'upcoming'
  };
  
  const futureEvent = await Events.create(futureEventData);
  return futureEvent;
};

// =============================================================================
// USER-EVENT SYNCHRONIZATION UTILITIES
// =============================================================================

/**
 * Synchronize user's events list after event modifications
 * @param {string} userId - User ID
 * @param {string} originalEventId - Original event ID
 * @param {string} newEventId - New event ID (if created)
 * @param {string} status - User's status for the new event
 */
const synchronizeUserEventList = async (userId, originalEventId, newEventId = null, status = 'accepted') => {
  const user = await User.findById(userId);
  if (!user) return;
  
  // Add new event if provided
  if (newEventId) {
    user.events.push({ event: newEventId, status });
  }
  
  await user.save();
};

/**
 * Remove user from event attendees and their events list
 * @param {string} userId - User ID to remove
 * @param {string} eventId - Event ID
 */
const removeUserFromEvent = async (userId, eventId) => {
  // Remove from user's events list
  await User.updateOne(
    { _id: userId },
    { $pull: { events: { event: eventId } } }
  );
};

/**
 * Synchronize all attendees with new separate event
 * @param {Array} attendees - Array of attendee objects
 * @param {string} newEventId - New event ID
 */
const synchronizeAttendeesWithNewEvent = async (attendees, newEventId) => {
  for (const attendee of attendees) {
    await synchronizeUserEventList(attendee.user, null, newEventId, attendee.status);
  }
};

// =============================================================================
// NOTIFICATION UTILITIES
// =============================================================================

/**
 * Send event update notifications with error handling
 * @param {string} eventId - Event ID
 * @param {string} senderId - ID of user making the update
 * @param {Array} attendeeIds - Array of attendee user IDs
 */
const sendEventUpdateNotifications = async (eventId, senderId, attendeeIds) => {
  try {
    await createEventUpdateNotification(eventId, senderId, attendeeIds);
  } catch (notificationError) {
    console.error('Error sending event update notifications:', notificationError);
    // Don't throw error - notification failures shouldn't break the main operation
  }
};

// =============================================================================
// ATTENDEE MANAGEMENT UTILITIES
// =============================================================================

/**
 * Remove attendee from event's attendees array
 * @param {Object} event - Event document
 * @param {string} attendeeId - Attendee ID to remove
 * @returns {boolean} Whether attendee was found and removed
 */
const removeAttendeeFromEventArray = async (event, attendeeId) => {
  const attendeeIndex = event.attendees.findIndex(
    attendee => attendee.user.toString() === attendeeId.toString()
  );
  
  if (attendeeIndex === -1) {
    return false; // Attendee not found
  }
  
  event.attendees.splice(attendeeIndex, 1);
  await event.save();
  return true;
};

/**
 * Create attendees list without specific user
 * @param {Array} originalAttendees - Original attendees array
 * @param {string} excludeUserId - User ID to exclude
 * @returns {Array} Filtered attendees array
 */
const createAttendeesListWithoutUser = (originalAttendees, excludeUserId) => {
  return originalAttendees.filter(
    attendee => attendee.user.toString() !== excludeUserId.toString()
  );
};

// =============================================================================
// RECURRING EVENT TYPE HANDLERS
// =============================================================================

/**
 * Handle "this occurrence only" recurring event update
 * @param {Object} originalEvent - Original recurring event
 * @param {Date} occurrenceDate - Occurrence date
 * @param {Object} modifications - Modifications to apply
 * @param {string} userStatus - User's attendance status
 * @returns {Object} Result object with success status and created event
 */
const handleThisOccurrenceOnlyUpdate = async (originalEvent, occurrenceDate, modifications, userStatus) => {
  const separateEvent = await createSeparateOccurrenceEvent(originalEvent, occurrenceDate, modifications);
  
  // Add the new event to user's events list with their original status
  await synchronizeUserEventList(originalEvent.creator, null, separateEvent._id, userStatus);
  
  return {
    success: true,
    message: 'Successfully updated this occurrence',
    event: separateEvent
  };
};

/**
 * Handle "this and future" recurring event update
 * @param {Object} originalEvent - Original recurring event
 * @param {Date} splitDate - Date to split from
 * @param {Object} modifications - Modifications to apply
 * @param {string} userStatus - User's attendance status
 * @returns {Object} Result object with success status and created event
 */
const handleThisAndFutureUpdate = async (originalEvent, splitDate, modifications, userStatus) => {
  const futureEvent = await splitRecurringEvent(originalEvent, splitDate, modifications);
  
  // Add the new event to user's events list with their original status
  await synchronizeUserEventList(originalEvent.creator, null, futureEvent._id, userStatus);
  
  return {
    success: true,
    message: 'Successfully updated this and future occurrences',
    event: futureEvent
  };
};

/**
 * Handle "all instances" recurring event update
 * @param {Object} event - Event to update
 * @param {Object} eventData - Update data
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID making the update
 * @returns {Object} Result object with success status and updated event
 */
const handleAllInstancesUpdate = async (event, eventData, eventId, userId) => {
  const sanitizedData = sanitizeEventUpdateData(eventData);
  Object.assign(event, sanitizedData);
  await event.save();
  
  // Send update notifications to all attendees
  const attendeeIds = event.attendees.map(attendee => attendee.user);
  await sendEventUpdateNotifications(eventId, userId, attendeeIds);
  
  return {
    success: true,
    message: 'Successfully updated all occurrences',
    event
  };
};

// =============================================================================
// DISTANCE AND LOCATION UTILITIES
// =============================================================================

/**
 * Convert degrees to radians
 * @param {number} value - Value in degrees
 * @returns {number} Value in radians
 */
const toRadians = (value) => {
  return (value * Math.PI) / 180;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3963; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate distance and filter events within specified radius
 * @param {Array} events - Array of events with location coordinates
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {number} searchDistance - Maximum distance in miles
 * @returns {Array} Array of events with distance information
 */
const calculateEventsDistance = (events, userLat, userLng, searchDistance) => {
  return events
    .map(event => {
      const coords = event.location?.coordinates;
      if (!coords?.lat || !coords?.lng) return null;

      const distance = calculateDistance(userLat, userLng, coords.lat, coords.lng);
      return { event, distance };
    })
    .filter(item => item && item.distance <= searchDistance)
    .sort((a, b) => {
      // First sort by distance
      const distanceDiff = a.distance - b.distance;
      if (distanceDiff !== 0) return distanceDiff;
      
      // If distances are equal, sort by start time
      return new Date(a.event.start_time) - new Date(b.event.start_time);
    });
};

/**
 * Find users within specified miles of a given location
 * @param {number} eventLat - Event latitude
 * @param {number} eventLng - Event longitude
 * @param {string} excludeUserId - User ID to exclude from results
 * @param {number} maxDistance - Maximum distance in miles (default: 50)
 * @returns {Array} Array of user IDs within the specified distance
 */
const findUsersWithinDistance = async (eventLat, eventLng, excludeUserId, maxDistance = 50) => {
  try {
    // Get all users with location data
    const users = await User.find({
      _id: { $ne: excludeUserId },
      'location.coordinates.lat': { $exists: true, $ne: null },
      'location.coordinates.lng': { $exists: true, $ne: null }
    }).select('_id location');

    const nearbyUsers = [];
    
    for (const user of users) {
      if (user.location?.coordinates?.lat && user.location?.coordinates?.lng) {
        const distance = calculateDistance(
          eventLat,
          eventLng,
          user.location.coordinates.lat,
          user.location.coordinates.lng
        );
        
        if (distance <= maxDistance) {
          nearbyUsers.push(user._id);
        }
      }
    }

    return nearbyUsers;
  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
};

// Legacy function name for backward compatibility
const findUsersWithin50Miles = async (eventLat, eventLng, excludeUserId) => {
  return findUsersWithinDistance(eventLat, eventLng, excludeUserId, 50);
};

// =============================================================================
// RECURRING EVENT DATE GENERATION UTILITIES
// =============================================================================

/**
 * Generates recurring event dates based on frequency (legacy function)
 * @param {Date} startDate - The start date of the event
 * @param {Date} endDate - The end date of the recurrence
 * @param {string} frequency - The frequency type (daily, weekly, monthly)
 * @returns {Date[]} - Array of occurrence dates
 */
const generateRecurringEventDates = (startDate, endDate, frequency) => {
  const now = new Date();
  let freq;
  
  // Convert frequency string to RRule frequency constant
  switch (frequency.toLowerCase()) {
    case 'daily':
      freq = RRule.DAILY;
      break;
    case 'weekly':
      freq = RRule.WEEKLY;
      break;
    case 'monthly':
      freq = RRule.MONTHLY;
      break;
    default:
      freq = RRule.WEEKLY; // Default to weekly if unknown
  }
  
  // Create RRule for recurring events
  const rule = new RRule({
    freq: freq,
    dtstart: startDate,
    until: endDate
  });
  
  // Get all occurrence dates
  let occurrences = rule.all();
  
  // Filter out past occurrences (except today)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  occurrences = occurrences.filter(date => date >= todayStart);
  
  // Limit to next 10 occurrences to avoid too many instances
  return occurrences;
};

/**
 * Process events for discovery pages - shows only the next upcoming occurrence of recurring events
 * @param {Array} events - Array of events
 * @param {Object} options - Processing options
 * @returns {Array} Processed events with only next occurrence for recurring events
 */
const processEventsForDiscovery = (events, options = {}) => {
  const now = new Date();
  const { excludeUserAttending = false, userId = null } = options;
  
  const processedEvents = [];

  for (const event of events) {
    // Skip if user is attending and we want to exclude those
    if (excludeUserAttending && userId) {
      const isUserAttending = event.attendees?.some(a => a.user.toString() === userId.toString());
      if (isUserAttending) continue;
    }

    const isRecurring = event.recurrence?.checked &&
                       event.recurrence?.frequency &&
                       event.recurrence?.frequency !== 'none';

    if (isRecurring) {
      // For recurring events, find only the NEXT upcoming occurrence
      const nextOccurrence = findNextRecurringOccurrence(event, now);
      if (nextOccurrence) {
        processedEvents.push(nextOccurrence);
      }
    } else {
      // For non-recurring events, include if they're in the future
      const eventEnd = new Date(event.end_time);
      if (eventEnd >= now) {
        const eventObj = event.toObject ? event.toObject() : event;
        processedEvents.push({
          ...eventObj,
          isRecurringOccurrence: false,
          userStatus: event.userStatus // Preserve userStatus if it exists
        });
      }
    }
  }

  // Sort events by start time
  processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return processedEvents;
};

/**
 * Find the next upcoming occurrence of a recurring event
 * @param {Object} event - The recurring event
 * @param {Date} fromDate - Date to search from (default: now)
 * @returns {Object|null} Next occurrence or null if none found
 */
const findNextRecurringOccurrence = (event, fromDate = new Date()) => {
  const eventStartTime = new Date(event.start_time);
  const eventEndTime = new Date(event.end_time);
  const recurrenceEndDate = event.recurrence.end_date 
    ? new Date(event.recurrence.end_date) 
    : new Date(fromDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

  // If recurrence has already ended, return null
  if (recurrenceEndDate < fromDate) return null;

  // Generate occurrences using RRule
  const ruleOptions = {
    freq: getFrequencyMapping(event.recurrence.frequency),
    dtstart: eventStartTime,
    until: recurrenceEndDate
  };

  const rule = new RRule(ruleOptions);
  
  // Get the next occurrence after fromDate
  const nextOccurrenceDate = rule.after(fromDate, false); // false = exclude fromDate itself
  
  if (!nextOccurrenceDate) return null;

  // Check if this date is excluded
  if (isDateExcluded(nextOccurrenceDate, event.excludedDates)) {
    // If excluded, find the next one after this
    const nextAfterExcluded = rule.after(nextOccurrenceDate, false);
    if (!nextAfterExcluded || isDateExcluded(nextAfterExcluded, event.excludedDates)) {
      return null; // Could implement recursive check, but for discovery this should suffice
    }
    // Use the next occurrence after the excluded one
    const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
    const occurrenceEndTime = new Date(nextAfterExcluded.getTime() + eventDuration);

    return {
      ...(event.toObject ? event.toObject() : event),
      start_time: nextAfterExcluded,
      end_time: occurrenceEndTime,
      _id: buildOccurrenceId(event._id, nextAfterExcluded),
      originalEventId: event._id,
      isRecurringOccurrence: true,
      userStatus: event.userStatus // Preserve userStatus if it exists
    };
  }

  // Calculate end time for this occurrence
  const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
  const occurrenceEndTime = new Date(nextOccurrenceDate.getTime() + eventDuration);

  return {
    ...(event.toObject ? event.toObject() : event),
    start_time: nextOccurrenceDate,
    end_time: occurrenceEndTime,
    _id: buildOccurrenceId(event._id, nextOccurrenceDate),
    originalEventId: event._id,
    isRecurringOccurrence: true,
    userStatus: event.userStatus // Preserve userStatus if it exists
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  getUserFilterData,
  buildEventFilter,
  getFrequencyMapping,
  isDateExcluded,
  generateRecurringOccurrences,
  processEventsWithRecurrence,
  enrichEventsWithUserData,
  filterUserEvents,
  createSeparateOccurrenceData,
  addExcludedDate,
  findAttendeeIndex,
  findUserEventIndex,
  findEventById,
  validateEventPermission,
  updateEventAttendee,
  removeAttendeeFromEvent,
  updateUserEventStatus,
  removeUserEvent,
  addUserNotInterestedEvent,
  handleRecurringEventModification,
  validateInputParams,
  createApiResponse,
  handleEventInvitationResponse,
  getStandardEventPopulateConfig,
  getEventWithCreatorAndAttendeesPopulate,
  commonValidations,
  addUserReportedEvent,
  getDateRanges,
  applyHomeScreenLimits,
  processEventsWithRecurrenceEnhanced,
  validateEventCreatorPermission,
  isRecurringEvent,
  sanitizeEventUpdateData,
  getUserAttendanceStatus,
  createSeparateOccurrenceEvent,
  splitRecurringEvent,
  synchronizeUserEventList,
  removeUserFromEvent,
  synchronizeAttendeesWithNewEvent,
  sendEventUpdateNotifications,
  removeAttendeeFromEventArray,
  createAttendeesListWithoutUser,
  handleThisOccurrenceOnlyUpdate,
  handleThisAndFutureUpdate,
  handleAllInstancesUpdate,
  toRadians,
  calculateDistance,
  calculateEventsDistance,
  findUsersWithinDistance,
  findUsersWithin50Miles,
  generateRecurringEventDates,
  processEventsForDiscovery,
  findNextRecurringOccurrence
}; 