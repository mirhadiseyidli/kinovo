const { RRule } = require('rrule');
const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const Notification = require('../database/schemas/notificationsSchema');
const { 
  createEventUpdateNotification, 
  createEventInvitationNotification, 
  createEventAttendanceNotification 
} = require('../controllers/notificationsController');
// Reminder scheduling is now handled directly in eventsController.js

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
  if (city) baseFilter['location.city'] = city;

  // Build visibility rules conditionally
  const visibilityRules = [];

  if (options.includePublic) {
    visibilityRules.push({ visibility: 'public' });
  }
  
  if (includePrivateFriends && filterData.friends?.length > 0) {
    visibilityRules.push({
      visibility: 'private',
      creator: { $in: filterData.friends }
    });
  }
  
  // ✅ Include user's own private and selected events
  if (userId) {
    visibilityRules.push({
      visibility: { $in: ['private', 'selected'] },
      creator: userId
    });
  }
  
  if (includeSelected && userId) {
    visibilityRules.push({
      visibility: 'selected',
      'attendees.user': userId
    });
  }
  
  if (visibilityRules.length > 0) {
    baseFilter.$and = [{ $or: visibilityRules }];
  }

  baseFilter.$and = [{ $or: visibilityRules }];

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
 * Calculate optimal lookback window (in days) for a recurring event
 * based on its duration. Adds a buffer and clamps within min/max limits.
 *
 * @param {Object} event - The event object containing start_time and end_time
 * @returns {number} Lookback window in days
 */
const calculateOptimalLookback = (event) => {
  const eventDuration = new Date(event.end_time) - new Date(event.start_time);
  const durationHours = eventDuration / (1000 * 60 * 60);

  const bufferMultiplier = 1.5;
  const minLookback = 1;
  const maxLookback = 14;

  const calculatedDays = Math.ceil((durationHours / 24) * bufferMultiplier);
  return Math.max(minLookback, Math.min(maxLookback, calculatedDays));
};

/**
 * Categorize a single event or occurrence as 'live', 'upcoming', or 'past'
 * based on the current time and the event's start and end.
 *
 * @param {Object} occurrence - Event or occurrence object with start_time and end_time
 * @param {Date} now - Current timestamp to compare against
 * @returns {Object} Object containing status ('live' | 'upcoming' | 'past') and isLive (boolean)
 */
const categorizeEventStatus = (occurrence, now) => {
  const occurrenceStart = new Date(occurrence.start_time);
  const occurrenceEnd = new Date(occurrence.end_time);

  if (now >= occurrenceStart && now <= occurrenceEnd) {
    return { timeStatus: 'live', isLive: true };
  } else if (now < occurrenceStart) {
    return { timeStatus: 'upcoming', isLive: false };
  } else {
    return { timeStatus: 'past', isLive: false };
  }
};

/**
 * Process events to handle recurring events and generate occurrences
 * @param {Array} events - Array of events
 * @param {Date} startRange - Start of date range (default: now)
 * @param {Date} endRange - End of date range (default: 1 year from now)
 * @param {Object} options - Processing options
 * @returns {Array} Processed events with recurring occurrences
 */
const processEventsWithRecurrence = (events, startRange = null, endRange = null) => {
  const now = new Date();
  const defaultEndRange = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
  
  const start = startRange || now;
  const end = endRange || defaultEndRange;

  const processedEvents = [];

  for (const event of events) {
    const isRecurring = isRecurringEvent(event);

    if (isRecurring) {
      // To catch live recurring events, we generate occurrences from a recent past date
      // and then filter to keep only those that haven't ended yet.
      // We look back 7 days to reasonably catch events that might still be ongoing.
      const lookbackDays = calculateOptimalLookback(event);
      const lookBehindStartDate = new Date(start.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

      const allPossibleOccurrences = generateRecurringOccurrences(event, lookBehindStartDate, end);

      const relevantOccurrences = allPossibleOccurrences
        .map(occurrence => {
          const eventStatus = categorizeEventStatus(occurrence, now);
          return {
            ...occurrence,
            ...eventStatus,
            occurrenceStatus: eventStatus.timeStatus
          };
        })
        .filter(occurrence =>
          occurrence.timeStatus === 'live' ||
          (occurrence.timeStatus === 'upcoming' && new Date(occurrence.start_time) >= start)
        );

      processedEvents.push(...relevantOccurrences);
    } else {
      const eventStatus = categorizeEventStatus(event, now);
      if (
        eventStatus.timeStatus === 'live' ||
        (eventStatus.timeStatus === 'upcoming' && new Date(event.start_time) >= start)
      ) {
        processedEvents.push({
          ...(event.toObject ? event.toObject() : event),
          ...eventStatus,
          isRecurringOccurrence: false,
          userStatus: event.userStatus,
        });
      }
    }
  }

  processedEvents.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.start_time) - new Date(b.start_time);
  });

  return processedEvents;
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
  // First filter valid events
  const filteredEvents = (userEvents || [])
    .filter(userEvent => {
      if (!userEvent.event) return false;
      
      const event = userEvent.event;
      const eventId = event._id.toString();
      const isReported = reportedEventIds.includes(eventId);
      const isNotInterested = notInterestedEventIds.includes(eventId);
      const hasAllowedStatus = allowedStatuses.includes(userEvent.status);
      
      // Filter out cancelled events
      if (event.status === 'cancelled') {
        return false;
      }
      
      return hasAllowedStatus && !isReported && !isNotInterested;
    });
  
  // Deduplicate by event ID, keeping the first occurrence (or prioritizing 'accepted' status)
  const eventMap = new Map();
  filteredEvents.forEach(userEvent => {
    const eventId = userEvent.event._id.toString();
    
    // If we haven't seen this event yet, add it
    if (!eventMap.has(eventId)) {
      eventMap.set(eventId, {
        ...userEvent.event.toObject(),
        userStatus: userEvent.status
      });
    } else {
      // If we have a duplicate, keep the one with 'accepted' status if available
      const existing = eventMap.get(eventId);
      if (userEvent.status === 'accepted' && existing.userStatus !== 'accepted') {
        eventMap.set(eventId, {
          ...userEvent.event.toObject(),
          userStatus: userEvent.status
        });
      }
    }
  });
  
  return Array.from(eventMap.values());
};

/**
 * Filter user events by status, exclusions, and visibility permissions
 * @param {Array} userEvents - User's events array
 * @param {Array} reportedEventIds - IDs of reported events
 * @param {Array} notInterestedEventIds - IDs of not interested events
 * @param {string} currentUserId - ID of the user viewing the events
 * @param {string} profileOwnerId - ID of the profile owner
 * @param {boolean} isFriend - Whether the viewer and profile owner are friends
 * @param {Array} allowedStatuses - Allowed event statuses (default: ['accepted', 'maybe'])
 * @returns {Array} Filtered events with user status
 */
const filterUserToViewEvents = (
  userEvents, 
  reportedEventIds, 
  notInterestedEventIds, 
  currentUserId, 
  profileOwnerId, 
  isFriend = false, 
  allowedStatuses = ['accepted', 'maybe']
) => {
  return (userEvents || [])
    .filter(userEvent => {
      if (!userEvent.event) return false;
      
      const event = userEvent.event;
      const eventId = event._id.toString();
      const isReported = reportedEventIds.includes(eventId);
      const isNotInterested = notInterestedEventIds.includes(eventId);
      const hasAllowedStatus = allowedStatuses.includes(userEvent.status);
      
      // Basic filtering (status, reports, not interested)
      if (!hasAllowedStatus || isReported || isNotInterested) {
        return false;
      }

      // Filter out cancelled events
      if (event.status === 'cancelled') {
        return false;
      }

      // If viewing own profile, show all events (no visibility filtering)
      const isOwnProfile = currentUserId && profileOwnerId && currentUserId.toString() === profileOwnerId.toString();
      if (isOwnProfile) {
        return true;
      }

      // For other users, apply visibility filtering
      
      // If user is not a friend, only show public events
      if (!isFriend) {
        return event.visibility === 'public';
      }
      
      // Handle visibility based on event type
      switch (event.visibility) {
        case 'public':
          return true;
        case 'private':
          // Private events are visible to friends OR if current user is an attendee
          if (isFriend) {
            return true;
          }
          // Even if not friends, show private events if user is an attendee
          const isAttendeeInPrivate = event.attendees?.some(
            attendee => attendee.user.toString() === currentUserId.toString()
          );
          return isAttendeeInPrivate;
        case 'selected':
          // Selected events are only visible if current user is an attendee
          const currentUserIsAttendee = event.attendees?.some(
            attendee => attendee.user.toString() === currentUserId.toString()
          );
          return currentUserIsAttendee;
        default:
          // Default to false for unknown visibility types
          return false;
      }
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
  return event.attendees.findIndex(attendee => {
    // Handle both populated and non-populated user field
    const attendeeUserId = attendee.user?._id || attendee.user;
    return attendeeUserId?.toString() === userId?.toString();
  });
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
    // Add new attendee with populated user object
    const populatedUser = await User.findById(userId);
    if (populatedUser) {
      event.attendees.push({
        user: populatedUser,
        status
      });
    } else {
      // Fallback to ObjectId if user not found
      event.attendees.push({
        user: userId,
        status
      });
    }
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

  if (attendeeIndex === -1) {
    return event; // No changes
  }
  
  event.attendees.splice(attendeeIndex, 1);
  await event.save();
  
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

  if (userEventIndex === -1) {
    return user; // No changes
  }

  user.events.splice(userEventIndex, 1);
  await user.save();
  
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
    if (!(param in params)) {
      missing.push(param);
    }
  }

  // Specific validations
  // Only validate status if it's specifically required (for RSVP operations)
  if (required.includes('status') && 'status' in params) {
    if (!['accepted', 'maybe', 'rejected', 'pending'].includes(params.status)) {
      invalid.push({ param: 'status', message: 'Invalid attendee status value' });
    }
  }

  if ('eventId' in params) {
    if (typeof params.eventId !== 'string') {
      invalid.push({ param: 'eventId', message: 'Event ID must be a string' });
    }
  }

  if ('attendeeId' in params) {
    if (typeof params.attendeeId !== 'string') {
      invalid.push({ param: 'attendeeId', message: 'Attendee ID must be a string' });
    }
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
 * Returns the standard Mongoose populate configuration for user events.
 * It filters out cancelled events and populates both the creator and attendees' user details.
 * 
 * - Populates `events.event` where `status !== 'cancelled'`
 * - Populates `creator` excluding sensitive fields like `password`
 * - Populates each attendee's `user` excluding `password`
 *
 * @returns {Object} Mongoose populate config
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
    threeMonthsFromNow: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
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
  // Handle both populated and non-populated creator field
  const creatorId = event?.creator?._id || event?.creator;
  return creatorId?.toString() === userId?.toString();
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
  
  // Ensure attendees are in the correct format (just user IDs, not populated objects)
  let attendeesData = modifications.attendees || originalEvent.attendees;
  if (attendeesData && attendeesData.length > 0) {
    attendeesData = attendeesData.map(att => ({
      user: typeof att.user === 'object' && att.user._id ? att.user._id : att.user,
      status: att.status
    }));
  }
  
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
    attendees: attendeesData,
    visibility: modifications.visibility || originalEvent.visibility,
    excludedDates: [], // Single events don't need excludedDates
    status: 'upcoming'
  };
  
  const separateEvent = await Events.create(eventData);
  
  // Add this date to the original event's excludedDates
  await addExcludedDate(originalEvent, occurrenceStartDate);
  
  // Populate the separate event before returning
  const populatedSeparateEvent = await Events.findById(separateEvent._id)
    .populate(getStandardEventPopulation());
  
  return populatedSeparateEvent;
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

  // Check if split date is before the first occurrence
  const firstOccurrence = new Date(originalEvent.start_time);
  if (splitStartDate.getTime() <= firstOccurrence.getTime()) {
    // Cannot split at or before the first occurrence — just return the original event
    return originalEvent;
  }
  
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

  // Calculate the correct end time for the future event
  const originalStartTime = new Date(originalEvent.start_time);
  const originalEndTime = new Date(originalEvent.end_time);
  const eventDuration = originalEndTime.getTime() - originalStartTime.getTime();
  
  // Use modified end time if provided, otherwise calculate based on duration
  const futureEndTime = modifications.end_time 
    ? new Date(modifications.end_time)
    : new Date(splitStartDate.getTime() + eventDuration);

  const futureEventData = {
    creator: originalEvent.creator,
    event_picture: modifications.event_picture || originalEvent.event_picture,
    title: modifications.title || originalEvent.title,
    category: modifications.category || originalEvent.category,
    description: modifications.description || originalEvent.description,
    location: modifications.location || originalEvent.location,
    start_time: splitStartDate,
    end_time: futureEndTime,
    capacity: modifications.capacity !== undefined ? modifications.capacity : originalEvent.capacity,
    recurrence: futureRecurrence,
    attendees: modifications.attendees || (originalEvent.attendees || []).map(att => ({
      user: att.user._id || att.user, // Normalize to ObjectId
      status: att.status
    })),
    visibility: modifications.visibility || originalEvent.visibility,
    excludedDates: originalEvent.excludedDates 
      ? originalEvent.excludedDates.filter(date => new Date(date) >= splitStartDate)
      : [],
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
  
  // Add new event if provided (but check for duplicates first)
  if (newEventId) {
    // Check if the new event already exists in user's events
    const existingIndex = user.events.findIndex(e => 
      e.event && e.event.toString() === newEventId.toString()
    );
    
    if (existingIndex !== -1) {
      // Update existing event status
      user.events[existingIndex].status = status;
    } else {
      // Add new event
      user.events.push({ event: newEventId, status });
    }
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
  const attendeeIndex = event.attendees.findIndex(attendee => {
    const attendeeUserId = attendee.user?._id || attendee.user;
    return attendeeUserId?.toString() === attendeeId?.toString();
  });
  
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
    if (event.status === 'cancelled') continue;
    const isRecurring = isRecurringEvent(event);

    if (isRecurring) {
      // For recurring events, find only the NEXT upcoming occurrence
      const nextOccurrence = findNextRecurringOccurrence(event, now);
      if (nextOccurrence) {
        processedEvents.push(nextOccurrence);
      }
    } else {
      // For non-recurring events, include if they're in the future
      if (event.end_time >= now) {
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
  let nextDate = rule.after(fromDate, false);
  const excludedSet = new Set(event.excludedDates.map(d => new Date(d).toDateString()));
  while (nextDate && excludedSet.has(nextDate.toDateString())) {
    const prev = nextDate;
    nextDate = rule.after(prev, false);
  }

  if (!nextDate) return null;

  // Use the next occurrence after the excluded one
  const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
  const occurrenceEndTime = new Date(nextDate.getTime() + eventDuration);

  return {
    ...(event.toObject ? event.toObject() : event),
    start_time: nextDate,
    end_time: occurrenceEndTime,
    _id: buildOccurrenceId(event._id, nextDate),
    originalEventId: event._id,
    isRecurringOccurrence: true,
    userStatus: event.userStatus // Preserve userStatus if it exists
  };
};

/**
 * Ensure the creator is included in the attendees list
 * @param {Array} attendees - Array of attendee objects
 * @param {string} userId - Creator's user ID
 * @returns {Array} Updated attendees array with creator included
 */
const ensureCreatorIsAttendee = (attendees, userId) => {
  // Handle case where attendees is undefined, null, or not an array
  const processedAttendees = Array.isArray(attendees) ? [...attendees] : [];
  const creatorIncluded = processedAttendees.some(
    att => att.user && att.user._id && att.user._id.toString() === userId
  );

  if (!creatorIncluded) {
    processedAttendees.unshift({ user: { _id: userId } });
  }

  return processedAttendees;
};

/**
 * Upsert an event into a user's events list with the specified status.
 * Removes any existing entry for the same event before inserting the new one.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} eventId - The ID of the event to upsert.
 * @param {string} [status='accepted'] - The attendance status to set ('accepted', 'maybe', etc.).
 */
const upsertUserEvent = async (userId, eventId, status = 'accepted') => {
  // Remove any existing event entry first
  await User.updateOne(
    { _id: userId },
    { $pull: { events: { event: eventId } } }
  );

  // Then safely add it back
  await User.updateOne(
    { _id: userId },
    { $push: { events: { event: eventId, status } } }
  );
};

/**
 * Add an event to multiple users' events lists with a specified status.
 * Uses $addToSet to avoid duplicates.
 *
 * @param {Array<string>} userIds - Array of user IDs.
 * @param {string} eventId - The ID of the event to add.
 * @param {string} [status='pending'] - The attendance status to set.
 */
const addEventToUsers = async (userIds, eventId, status = 'pending') => {
  if (!userIds || userIds.length === 0) return;

  const usersWithoutEvent = await User.find({
    _id: { $in: userIds },
    'events.event': { $ne: eventId }
  }).select('_id');

  const filteredIds = usersWithoutEvent.map(u => u._id);

  if (filteredIds.length > 0) {
    await User.updateMany(
      { _id: { $in: filteredIds } },
      {
        $addToSet: {
          events: { event: eventId, status }
        }
      }
    );
  }
};

// Note: scheduleEventReminders has been moved to reminderSchedulingUtils.js
// and replaced with user-specific reminder scheduling functions

/**
 * Filter attention required events
 * @param {Array} events - Array of events
 * @param {Array} reportedEventIds - Array of reported event IDs
 * @param {Array} notInterestedEventIds - Array of not interested event IDs
 * @param {Date} now - Current date
 * @returns {Array} Filtered events
 */
const filterAttentionRequiredEvents = (events, reportedEventIds, notInterestedEventIds, now) => {
  return events.filter(userEvent => {
    // Make sure the event exists and hasn't been cancelled
    if (!userEvent.event || userEvent.event.status === 'cancelled') {
      return false;
    }
    
    // Filter out reported events and not interested events
    if (reportedEventIds.includes(userEvent.event._id.toString()) || 
        notInterestedEventIds.includes(userEvent.event._id.toString())) {
      return false;
    }

    // For non-recurring events, check if they are in the future or ongoing.
    // For recurring events, we let them pass and filter occurrences later.
    const isRecurring = userEvent.event.recurrence?.checked;
    if (!isRecurring) {
      const eventEndTime = new Date(userEvent.event.end_time);
      if (eventEndTime < now) {
        return false;
      }
    } else {
      const eventRecurrenceEndTime = new Date(userEvent.event.recurrence.end_date);
      if (eventRecurrenceEndTime < now) {
        return false;
      }
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
};

/**
 * Base query for recommended events
 * @param {Object} user - User object
 * @param {Date} now - Current date
 * @param {Array} friendIds - Array of friend IDs
 * @returns {Object} Base query
 */
const recommendedEventsBaseQuery = async (user, now, friendIds, userActivities) => {
  const { reportedEventIds, notInterestedEventIds } = await getUserFilterData(user._id);

  // Base query for upcoming events that are either public or private from friends
  const baseQuery = {
    status: { $ne: 'cancelled' },
    // For recurring events, we need to check programmatically, so include events that either:
    // 1. Haven't ended yet (non-recurring), OR
    // 2. Are recurring (we'll filter them later)
    $or: [
      // Non-recurring events that haven't ended
      {
        'recurrence.checked': { $ne: true },
        end_time: { $gte: now }
      },
      // Recurring events (filter later programmatically)
      {
        'recurrence.checked': true
      }
    ],
    $and: [
      {
        $or: [
          { visibility: 'public' },
          { visibility: 'private', creator: { $in: friendIds } },
          { visibility: 'selected', 'attendees.user': user._id },
          { creator: user._id }
        ]
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

  return baseQuery;
}

/**
 * Base query for friends events
 * @param {Object} user - User object
 * @param {Date} now - Current date
 * @param {Array} friends - Array of friends
 * @param {Object} filterData - Filter data
 * @returns {Object} Base query
 */
const buildFriendsEventsBaseQuery = async (userId, now, friends, filterData) => {
  return {
    status: { $ne: 'cancelled' },
    // For recurring events, we need to check programmatically, so include events that either:
    // 1. Haven't ended yet (non-recurring), OR
    // 2. Are recurring (we'll filter them later)
    $or: [
      // Non-recurring events that haven't ended
      {
        'recurrence.checked': { $ne: true },
        end_time: { $gte: now }
      },
      // Recurring events (filter later programmatically)
      {
        'recurrence.checked': true
      }
    ],
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
            'attendees.user': userId
          }
        ]
      }
    ]
  }
};

/**
 * Add user-specific fields to events
 * @param {Array} events - Array of events
 * @param {string} userId - Current user ID
 * @param {Array} friends - User's friends array
 * @returns {Array} Events with user-specific fields added
 */
// Enhanced version combining both approaches
const enrichEventWithUserContext = async (event, currentUserId, options = {}) => {
  const { includeFriends = true, userFriends = null, eventToView = null } = options;

  try {
    // Defensive check for event structure
    if (!event || !currentUserId) {
      console.warn('Invalid event or userId in enrichEventWithUserContext:', {
        eventId: event?._id,
        currentUserId
      });
      return {
        ...event,
        userStatus: null,
        isUserAttending: false,
        isUserInvited: false,
        isUserCreator: false,
        isFriendEvent: false
      };
    }

    // Get user's friends if needed and not provided
    let friends = userFriends;
    if (includeFriends && !friends) {
      const user = await User.findById(currentUserId).select('friends');
      friends = user?.friends || [];
    }

    // Ensure we're working with a plain object
    const eventObj = event.toObject ? event.toObject() : event;

    // CRITICAL: Ensure attendees are populated objects, not strings
    if (eventObj.attendees) {
      const hasUnpopulatedAttendees = eventObj.attendees.some(att =>
        typeof att.user === 'string'
      );

      if (hasUnpopulatedAttendees) {
        console.error('❌ UNPOPULATED ATTENDEES DETECTED:', {
          eventId: eventObj._id,
          attendees: eventObj.attendees
        });
        // This is the bug you're experiencing - return error state
        throw new Error(`Event ${eventObj._id} has unpopulated attendees - this causes user 
relationship bugs`);
      }
    }

    // Safe attendee lookup with comprehensive null checks
    const userAttendee = eventObj.attendees?.find(att => {
      if (!att || !att.user) return false;

      try {
        const attendeeUserId = att.user._id?.toString() || att.user.toString?.();
        return attendeeUserId === currentUserId.toString();
      } catch (err) {
        console.warn('Error processing attendee:', {
          eventId: eventObj._id,
          attendeeUser: att.user,
          error: err.message
        });
        return false;
      }
    });

    // Safe creator lookup
    let creatorId = '';
    let isCreator = false;

    if (eventObj.creator) {
      try {
        // CRITICAL: Ensure creator is populated, not string
        if (typeof eventObj.creator === 'string') {
          console.error('❌ UNPOPULATED CREATOR DETECTED:', {
            eventId: eventObj._id,
            creator: eventObj.creator
          });
          throw new Error(`Event ${eventObj._id} has unpopulated creator - this causes user 
relationship bugs`);
        }

        creatorId = eventObj.creator._id?.toString() || '';
        isCreator = creatorId === currentUserId.toString();
      } catch (err) {
        console.warn('Error processing creator:', {
          eventId: eventObj._id,
          creator: eventObj.creator,
          error: err.message
        });
      }
    }

    // Safe friends check
    const isFriendEvent = includeFriends && friends ?
      friends.some(friendId => friendId.toString() === creatorId) : false;

    // Check if this event is the one to view (compare IDs)
    const isEventToView = eventToView && eventObj._id && eventObj._id.toString() === eventToView.toString();
    
    return {
      ...eventObj,
      // STANDARD USER RELATIONSHIP FIELDS
      userStatus: userAttendee?.status || null,
      isUserAttending: !!userAttendee,
      isUserInvited: !!userAttendee,
      isUserCreator: isCreator,
      isFriendEvent: isFriendEvent,

      // ENSURE ATTENDEES ARE ALWAYS POPULATED (validation)
      attendees: eventObj.attendees?.map(att => {
        if (typeof att.user === 'string') {
          throw new Error(`Attendee user is not populated: ${att.user}`);
        }
        return {
          _id: att._id,
          status: att.status,
          user: att.user // Validated to be object
        };
      }) || [],

      // ENSURE CREATOR IS ALWAYS POPULATED (validation)
      creator: eventObj.creator,
      
      // Include eventToView flag if this is the event to view
      ...(isEventToView && { eventToView: true })
    };

  } catch (error) {
    console.error('❌ ERROR in enrichEventWithUserContext:', {
      error: error.message,
      eventId: event?._id,
      currentUserId,
      stack: error.stack
    });

    // For unpopulated data errors, throw to surface the issue
    if (error.message.includes('unpopulated')) {
      throw error;
    }

    // For other errors, return safe defaults
    const eventObj = event?.toObject ? event.toObject() : event || {};
    return {
      ...eventObj,
      userStatus: null,
      isUserAttending: false,
      isUserInvited: false,
      isUserCreator: false,
      isFriendEvent: false
    };
  }
};

// Array processing wrapper (keeps your existing pattern)
const enrichEventsWithUserData = async (events, userId, friends = []) => {
  const results = [];

  for (const event of events) {
    try {
      const enriched = await enrichEventWithUserContext(event, userId, {
        includeFriends: true,
        userFriends: friends
      });
      results.push(enriched);
    } catch (error) {
      // Log the error but continue processing other events
      console.error('Failed to enrich event:', error.message);
      // Return event with safe defaults rather than crashing
      results.push({
        ...event,
        userStatus: null,
        isUserAttending: false,
        isUserInvited: false,
        isUserCreator: false,
        isFriendEvent: false
      });
    }
  }

  return results;
};

const getStandardEventPopulation = () => [
  {
    path: 'attendees.user',
    select: '-password -__v'
  },
  {
    path: 'creator',
    select: '-password -__v'
  }
];

/**
 * Process event invitations (reusable utility)
 */
const processEventInvitations = async (invitees, targetEventId, targetEvent) => {
  const { updateEventAttendee, updateUserEventStatus, createEventInvitationNotification } = require('../utils/eventUtils');
  
  for (const invitee of invitees) {
    await updateEventAttendee(targetEvent, invitee, 'pending');
    await updateUserEventStatus(invitee, targetEventId, 'pending');
  }

  // Send invitation notifications (don't fail on notification errors)
  try {
    await createEventInvitationNotification(targetEventId, invitees);
  } catch (notificationError) {
    console.error('Error sending event invitation notifications:', notificationError);
  }
};

/**
 * Build enriched event response (reusable utility)
 * Handles both single events and recurring event modifications
 */
const buildEnrichedEventResponse = async (eventOrId, currentUserId, message, extraData = {}) => {
  // Handle case where event object is passed directly (for recurring modifications)
  let enrichedEvent;
  // Prepare options for enrichEventWithUserContext, including eventToView if it exists
  const enrichOptions = {};
  if (extraData.eventToView) {
    enrichOptions.eventToView = extraData.eventToView;
  }
  
  if (typeof eventOrId === 'object' && eventOrId._id) {
    // Event object passed directly - check if ALL attendees are fully populated
    const isFullyPopulated = eventOrId.populated && 
      eventOrId.populated('attendees.user') && 
      eventOrId.populated('creator') &&
      // Additional check: ensure all attendees.user are objects (not undefined)
      eventOrId.attendees && 
      eventOrId.attendees.every(att => att.user && typeof att.user === 'object' && att.user._id);
    
    if (isFullyPopulated) {
      enrichedEvent = await enrichEventWithUserContext(eventOrId, currentUserId, enrichOptions);
    } else {
      // Re-fetch with population if needed (this is the case for newly created separate events or mixed population)
      const populatedEvent = await Events.findById(eventOrId._id)
        .populate(getStandardEventPopulation());
      enrichedEvent = await enrichEventWithUserContext(populatedEvent, currentUserId, enrichOptions);
    }
  } else {
    // Event ID passed - fetch and enrich
    const updatedEvent = await Events.findById(eventOrId)
      .populate(getStandardEventPopulation());
    enrichedEvent = await enrichEventWithUserContext(updatedEvent, currentUserId, enrichOptions);
  }

  // Prepare events array for response
  const eventsArray = [enrichedEvent];
  
  // For this_only: Include master event with updated excludedDates
  if (extraData.recurringModificationType === 'this_only' && extraData.masterEventId) {
    let masterEvent;
    // Handle both event object and event ID
    if (typeof extraData.masterEventId === 'object' && extraData.masterEventId._id) {
      // Event object passed - check if populated
      masterEvent = extraData.masterEventId.populated('attendees.user') && extraData.masterEventId.populated('creator')
        ? extraData.masterEventId
        : await Events.findById(extraData.masterEventId._id).populate(getStandardEventPopulation());
    } else {
      // Event ID passed - fetch and populate
      masterEvent = await Events.findById(extraData.masterEventId)
        .populate(getStandardEventPopulation());
    }
    const enrichedMasterEvent = await enrichEventWithUserContext(masterEvent, currentUserId);
    eventsArray.push(enrichedMasterEvent);
  }
  
  // For all_future: Include original event if it was split
  if (extraData.recurringModificationType === 'all_future' && extraData.originalEventId) {
    let originalEvent;
    // Handle both event object and event ID
    if (typeof extraData.originalEventId === 'object' && extraData.originalEventId._id) {
      // Event object passed - check if populated
      originalEvent = extraData.originalEventId.populated('attendees.user') && extraData.originalEventId.populated('creator')
        ? extraData.originalEventId
        : await Events.findById(extraData.originalEventId._id).populate(getStandardEventPopulation());
    } else {
      // Event ID passed - fetch and populate
      originalEvent = await Events.findById(extraData.originalEventId)
        .populate(getStandardEventPopulation());
    }
    const enrichedOriginalEvent = await enrichEventWithUserContext(originalEvent, currentUserId);
    eventsArray.unshift(enrichedOriginalEvent); // Put original event first in array
  }

  // Return simplified response with just events array and essential metadata
  return {
    success: true,
    message,
    events: eventsArray,
    ...(extraData.recurringModificationType && { 
      modificationType: extraData.recurringModificationType,
      status: extraData.status 
    })
  };
};

/**
 * Event array response utility
 */
const buildEnrichedEventsResponse = async (events, currentUserId, message, extraData = {}) => {
  // Use the error-resilient version
  const enrichedEvents = await enrichEventsWithUserData(events, currentUserId);

  return {
    success: true,
    message,
    events: enrichedEvents,
    ...extraData
  };
};

/**
 * Success response utility
 */
const buildSuccessResponse = (message, extraData = {}) => {
  return {
    success: true,
    message,
    ...extraData
  };
};

const validateEventModificationRequest = async (req, requiredParams = []) => {
  
  const { occurrenceDate, modifyType } = req.body;
  
  // Merge params and body for validation (params take precedence for route params like eventId)
  const allParams = { ...req.body, ...req.params };
  
  // Get eventId from either source
  const eventId = req.params.eventId || req.body.eventId;
  
  // Validate required parameters (check both body and params)
  const validation = validateInputParams(allParams, requiredParams);
  
  if (!validation.isValid) {
    return {
      isValid: false,
      error: {
        status: 400,
        message: `Missing parameters: ${validation.missing.join(', ')}${validation.invalid.length ? `. Invalid: ${validation.invalid.map(i => i.message).join(', ')}` : ''}`
      }
    };
  }
  
  // Find event
  const event = await findEventById(eventId, {
    populate: getStandardEventPopulation()
  });
  
  if (!event) {
    return {
      isValid: false,
      error: {
        status: 404,
        message: 'Event not found'
      }
    };
  }
  
  return {
    isValid: true,
    event,
    isRecurring: isRecurringEvent(event),
    occurrenceDate,
    modifyType
  };
};

const validateEventPermissions = (event, userId, permissionType = 'creator') => {
  if (permissionType === 'creator') {
    const isCreator = validateEventCreatorPermission(event, userId);
    
    if (!isCreator) {
      return {
        isValid: false,
        error: {
          status: 400,
          message: 'Only the event creator can perform this action'
        }
      };
    }
  } else if (permissionType === 'attendee') {
    const attendeeIndex = findAttendeeIndex(event, userId);
    
    if (attendeeIndex === -1) {
      return {
        isValid: false,
        error: {
          status: 400,
          message: 'You are not an attendee of this event'
        }
      };
    }
    return {
      isValid: true,
      attendeeIndex
    };
  }
  
  return { isValid: true };
};

const handleRecurringEventOperation = async (options) => {
  const {
    event,
    occurrenceDate,
    modifyType,
    operation,
    operationData,
    userId
  } = options;
  
  // Not a recurring event or no modification type specified
  if (!isRecurringEvent(event) || !occurrenceDate || !modifyType) {
    return {
      type: 'default',
      event,
      shouldContinue: true
    };
  }
  
  let result = {
    type: modifyType,
    shouldContinue: false
  };
  
  switch (modifyType) {
    case 'this_only':
      result = await handleThisOnlyOperation(event, occurrenceDate, operation, operationData, userId);
      break;
      
    case 'all_future':
      result = await handleAllFutureOperation(event, occurrenceDate, operation, operationData, userId);
      break;
      
    default:
      result.shouldContinue = true;
  }
  
  return result;
};

const handleThisOnlyOperation = async (event, occurrenceDate, operation, operationData, userId) => {
  let modificationData = {};
  
  switch (operation) {
    case 'removeAttendee':
      modificationData.attendees = createAttendeesListWithoutUser(event.attendees, operationData.attendeeId);
      break;
      
    case 'updateEvent':
      modificationData = operationData.eventData;
      break;
      
    case 'joinEvent':
      const existingIndex = findAttendeeIndex(event, userId);
      if (existingIndex !== -1) {
        modificationData.attendees = event.attendees.map((att, index) => 
          index === existingIndex 
            ? { ...att.toObject(), status: operationData.status } 
            : att.toObject()
        );
      } else {
        modificationData.attendees = [...event.attendees, { user: userId, status: operationData.status }];
      }
      break;
      
    case 'cancelEvent':
      await addExcludedDate(event, new Date(occurrenceDate));
      return {
        type: 'this_only',
        cancelled: true,
        occurrenceDate
      };
      
    case 'respondInvitation':
      modificationData.attendees = event.attendees.map(att => 
        att.user.toString() === userId.toString()
          ? { ...att.toObject(), status: operationData.status }
          : att.toObject()
      );
      break;
      
    case 'inviteAttendees':
      const newInvitees = operationData.invitees.map(userId => ({ user: userId, status: 'pending' }));
      modificationData.attendees = [...event.attendees, ...newInvitees];
      break;
  }
  
  const separateEvent = await createSeparateOccurrenceEvent(event, occurrenceDate, modificationData);
  
  return {
    type: 'this_only',
    separateEvent,
    occurrenceDate
  };
};

const handleAllFutureOperation = async (event, occurrenceDate, operation, operationData, userId) => {
  const futureEvent = await splitRecurringEvent(event, new Date(occurrenceDate));
  
  switch (operation) {
    case 'removeAttendee':
      await removeAttendeeFromEventArray(futureEvent, operationData.attendeeId);
      await removeUserFromEvent(operationData.attendeeId, futureEvent._id);
      break;
      
    case 'updateEvent':
      Object.assign(futureEvent, sanitizeEventUpdateData(operationData.eventData));
      await futureEvent.save();
      break;
      
    case 'joinEvent':
      await updateEventAttendee(futureEvent, userId, operationData.status);
      await updateUserEventStatus(userId, futureEvent._id, operationData.status);
      break;
      
    case 'cancelEvent':
      futureEvent.status = 'cancelled';
      await futureEvent.save();
      break;
      
    case 'respondInvitation':
      await updateEventAttendee(futureEvent, userId, operationData.status);
      await updateUserEventStatus(userId, futureEvent._id, operationData.status);
      break;
      
    case 'inviteAttendees':
      for (const invitee of operationData.invitees) {
        await updateEventAttendee(futureEvent, invitee, 'pending');
        await updateUserEventStatus(invitee, futureEvent._id, 'pending');
      }
      break;
  }
  
  return {
    type: 'all_future',
    futureEvent,
    occurrenceDate
  };
};

// Reminder scheduling functions removed - now handled directly in eventsController.js

const sendEventNotifications = async (options) => {
  const {
    operation,
    eventId,
    userId,
    attendeeIds,
    status
  } = options;
  
  if (!attendeeIds || attendeeIds.length === 0) return;
  
  try {
    switch (operation) {
      case 'invite':
        await createEventInvitationNotification(eventId, attendeeIds);
        break;
        
      case 'update':
        await createEventUpdateNotification(eventId, userId, attendeeIds);
        break;
        
      case 'cancel':
        await createEventUpdateNotification(eventId, userId, attendeeIds);
        break;
        
      case 'attendance':
        if (status === 'accepted') {
          await createEventAttendanceNotification(eventId, userId, status);
        }
        break;
    }
  } catch (error) {
    console.error(`Error sending ${operation} notifications:`, error);
    // Don't throw - notifications shouldn't break the main operation
  }
};

const updateNotificationStatus = async (userId, eventId, type, status) => {
  try {
    await Notification.findOneAndUpdate(
      {
        recipient: userId,
        event: eventId,
        type: type
      },
      {
        status: status,
        is_seen: true,
        updated_at: new Date()
      }
    );
  } catch (error) {
    console.error('Failed to update notification status:', error);
  }
};

/**
 * Add eventToView field to an event object (mutates the event)
 * Used for recurring event controllers to determine which event to display to user
 * @param {Object} event - The event object to modify
 * @param {boolean} shouldView - Whether this event should be viewed (default: true)
 * @returns {Object} The same event object with eventToView field added
 */
const addEventToViewFlag = (event, shouldView = false) => {
  event.eventToView = shouldView;
  return event;
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  getUserFilterData, // reviewed
  buildEventFilter, // reviewed
  getFrequencyMapping,
  isDateExcluded, // reviewed
  generateRecurringOccurrences,
  processEventsWithRecurrence, // reviewed
  enrichEventsWithUserData,
  filterUserEvents, // reviewed
  filterUserToViewEvents,
  createSeparateOccurrenceData, // reviewed
  addExcludedDate,
  findAttendeeIndex, // reviewed
  findUserEventIndex,
  findEventById,
  validateEventPermission,
  updateEventAttendee,
  removeAttendeeFromEvent, // reviewed
  updateUserEventStatus,
  removeUserEvent, // reviewed
  addUserNotInterestedEvent, // reviewed
  handleRecurringEventModification, // reviewed
  validateInputParams, // reviewed
  createApiResponse,
  handleEventInvitationResponse,
  getStandardEventPopulateConfig, // reviewed
  getEventWithCreatorAndAttendeesPopulate,
  commonValidations,
  addUserReportedEvent,
  getDateRanges, // reviewed
  applyHomeScreenLimits,
  processEventsWithRecurrenceEnhanced, // reviewed
  validateEventCreatorPermission, // reviewed
  isRecurringEvent, // reviewed
  sanitizeEventUpdateData,
  getUserAttendanceStatus, // reviewed
  createSeparateOccurrenceEvent, // reviewed
  splitRecurringEvent, // reviewed
  synchronizeUserEventList, // reviewed
  removeUserFromEvent, // reviewed
  synchronizeAttendeesWithNewEvent, // reviewed
  sendEventUpdateNotifications,
  removeAttendeeFromEventArray, // reviewed
  createAttendeesListWithoutUser, // reviewed
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
  findNextRecurringOccurrence,
  ensureCreatorIsAttendee, // reviewed
  upsertUserEvent, // reviewed
  addEventToUsers, // reviewed
  // scheduleEventReminders moved to reminderSchedulingUtils.js
  filterAttentionRequiredEvents, // reviewed
  recommendedEventsBaseQuery, // reviewed
  buildFriendsEventsBaseQuery, // reviewed
  enrichEventWithUserContext,
  getStandardEventPopulation,
  processEventInvitations,
  buildEnrichedEventResponse,
  buildEnrichedEventsResponse,
  buildSuccessResponse,
  validateEventModificationRequest,
  validateEventPermissions,
  handleRecurringEventOperation,
  handleThisOnlyOperation,
  handleAllFutureOperation,
  // Reminder functions removed - handled in eventsController.js
  sendEventNotifications,
  updateNotificationStatus,
  addEventToViewFlag,
}; 