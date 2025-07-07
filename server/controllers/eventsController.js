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
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: [
          { path: 'creator', select: '_id full_name profile_picture' },
          {
            path: 'attendees.user',
            model: 'Users',
            select: '_id full_name profile_picture'
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

    // Include events with 'accepted' or 'maybe' status and filter out reported and not interested events
    const relevantEvents = (user.events || [])
      .filter(userEvent => 
        userEvent.event && 
        (userEvent.status === 'accepted' || userEvent.status === 'maybe') &&
        !reportedEventIds.includes(userEvent.event._id.toString()) && // Filter out reported events
        !notInterestedEventIds.includes(userEvent.event._id.toString()) // Filter out not interested events
      )
      .map(userEvent => ({
        ...userEvent.event.toObject(),
        userStatus: userEvent.status // Include user's response status
      }));

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

    // Get the list of reported event IDs
    const reportedEventIds = (user.reported_events || []).map(event => 
      event.toString()
    );
    
    // Get the list of not interested event IDs
    const notInterestedEventIds = (user.not_interested_events || []).map(item => 
      item.event.toString()
    );

    const now = new Date();
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); 

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

    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    const allUpcomingOccurrences = [];

    // Process each user event
    for (const userEvent of user.events || []) {
      // Include events with 'accepted' or 'maybe' status
      const isIncluded = userEvent.status === 'accepted' || userEvent.status === 'maybe';
      const hasEvent = !!userEvent.event;
      const isReported = hasEvent && reportedEventIds.includes(userEvent.event._id.toString());
      const isNotInterested = hasEvent && notInterestedEventIds.includes(userEvent.event._id.toString());
      if (!isIncluded || !hasEvent || isReported || isNotInterested) continue;

      const event = userEvent.event;
      const eventStartTime = new Date(event.start_time);
      const eventEndTime = new Date(event.end_time);

      // Check if the event is recurring
      if (event.recurrence && event.recurrence.checked && event.recurrence.frequency && event.recurrence.frequency !== 'none') {
        // Handle recurring events
        const recurrenceEndDate = event.recurrence.end_date ? new Date(event.recurrence.end_date) : futureLimit;
        
        // Skip if recurrence has already ended
        if (recurrenceEndDate < now) continue;

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
        
        // Get upcoming occurrences
        const upcomingOccurrences = rule.between(now, futureLimit, true);
        
        // Create event objects for each occurrence, filtering out excluded dates
        for (const occurrenceDate of upcomingOccurrences) {
          // Check if this date is in excludedDates
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration of the original event
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            // Create a new event object for this occurrence
            const eventOccurrence = {
              ...event.toObject(),
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`, // Unique ID for this occurrence
              originalEventId: event._id, // Keep reference to original event
              isRecurringOccurrence: true,
              userStatus: userEvent.status // Include user's response status
            };

            allUpcomingOccurrences.push(eventOccurrence);
          }
        }
      } else {
        // Handle non-recurring events
        const isUpcoming = (eventStartTime > now) || (eventStartTime <= now && eventEndTime >= now);
        if (isUpcoming) {
          allUpcomingOccurrences.push({
            ...event.toObject(),
            isRecurringOccurrence: false,
            userStatus: userEvent.status // Include user's response status
          });
        }
      }
    }

    // Sort all occurrences by start time
    allUpcomingOccurrences.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Apply limit if request is from home screen
    const finalEvents = fromHomeScreen 
      ? allUpcomingOccurrences.slice(0, 3) 
      : allUpcomingOccurrences;

    if (finalEvents.length === 0) {
      return res.status(201).json({ message: 'No events found', events: [] });
    }

    res.status(200).json({ 
      events: finalEvents,
      // Add metadata to help frontend understand the response
      metadata: {
        fromHomeScreen,
        totalAvailable: allUpcomingOccurrences.length,
        returned: finalEvents.length
      }
    });
  } catch (error) {
    console.error('Error in getMyUpcomingEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyPastEvents = async (req, res) => {
  try {
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

    const now = new Date();

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

    // Get the current user's reported events and not interested events
    const currentUser = await User.findById(req.user._id).select('reported_events not_interested_events');
    const reportedEventIds = (currentUser?.reported_events || []).map(event => 
      event.toString()
    );
    const notInterestedEventIds = (currentUser?.not_interested_events || []).map(item => 
      item.event.toString()
    );

    const user = await User.findById(userId).populate({
      path: 'events.event',
      match: { status: { $ne: 'cancelled' } },
      populate: [
        { path: 'creator', select: '_id full_name profile_picture' },
        {
          path: 'attendees.user',
          model: 'Users',
          select: '_id full_name profile_picture'
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Include events with 'accepted' or 'maybe' status
    const relevantEvents = (user.events || [])
      .filter(userEvent => 
        userEvent.event && 
        (userEvent.status === 'accepted' || userEvent.status === 'maybe') &&
        !reportedEventIds.includes(userEvent.event._id.toString()) && // Filter out events the current user reported
        !notInterestedEventIds.includes(userEvent.event._id.toString()) // Filter out not interested events
      )
      .map(userEvent => ({
        ...userEvent.event.toObject(),
        userStatus: userEvent.status // Include user's response status
      }));

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

    // Fetch user's friends, reported events, and not interested events
    const user = await User.findById(req.user._id).select('friends reported_events not_interested_events');
    const friends = user.friends || [];
    const reportedEventIds = (user.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user.not_interested_events || []).map(item => item.event.toString());

    // Get current date and time
    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    // Query events: public or private and created by a friend
    const events = await Events.find({
      $and: [
        { status: { $ne: 'cancelled' } },
        { _id: { $nin: reportedEventIds } }, // Exclude reported events
        { _id: { $nin: notInterestedEventIds } }, // Exclude not interested events
        {
          $or: [
            { visibility: 'public' },
            { visibility: 'private', creator: { $in: friends } }
          ]
        },
        {
          $or: [
            // Non-recurring events that haven't ended yet
            {
              $and: [
                { 'recurrence.checked': { $ne: true } },
                { end_time: { $gte: now } }
              ]
            },
            // Recurring events that haven't reached their end date
            {
              $and: [
                { 'recurrence.checked': true },
                { 'recurrence.frequency': { $ne: 'none' } },
                {
                  $or: [
                    { 'recurrence.end_date': { $exists: false } },
                    { 'recurrence.end_date': { $gte: now } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    .populate('creator', 'first_name last_name username full_name profile_picture'); // Populate creator with user details

    // Process events to get upcoming occurrences
    const processedEvents = [];
    
    for (const event of events) {
      const isUserAttending = event.attendees.some(a => a.user.toString() === req.user._id.toString());
      if (isUserAttending) continue;

      const isRecurring = event.recurrence?.checked &&
                         event.recurrence?.frequency &&
                         event.recurrence?.frequency !== 'none';

      if (isRecurring) {
        // For recurring events, generate upcoming occurrences
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        const recurrenceEndDate = event.recurrence.end_date ? new Date(event.recurrence.end_date) : futureLimit;
        
        if (recurrenceEndDate < now) continue;

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
        const upcomingOccurrences = rule.between(now, futureLimit, true);
        
        // Create event objects for each upcoming occurrence
        for (const occurrenceDate of upcomingOccurrences) {
          // Skip if this date is excluded
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration of the original event
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            processedEvents.push({
              ...event.toObject(),
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`,
              originalEventId: event._id,
              isRecurringOccurrence: true
            });
          }
        }
      } else {
        // For non-recurring events, just check if they haven't ended
        const end = new Date(event.end_time);
        if (end >= now) {
          processedEvents.push(event.toObject());
        }
      }
    }

    // Haversine formula helper function
    const toRad = (value) => (value * Math.PI) / 180;
    const EARTH_RADIUS_MILES = 3958.8;

    // Calculate distances and filter nearby events
    const nearbyEvents = processedEvents
      .map(event => {
        const coords = event.location?.coordinates;
        if (!coords?.lat || !coords?.lng) return null;

        const dLat = toRad(coords.lat - userLat);
        const dLng = toRad(coords.lng - userLng);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(userLat)) * Math.cos(toRad(coords.lat)) *
                  Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = EARTH_RADIUS_MILES * c;
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
    
    if (!eventId || !status) {
      return res.status(400).json({ message: 'Event ID and status are required' });
    }

    if (!['accepted', 'maybe', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted, maybe, or rejected' });
    }

    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is in the attendees list
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'You are not invited to this event' });
    }

    // Check if this is a recurring event and we have modification options
    const isRecurringEvent = event.recurrence?.checked && 
                            event.recurrence?.frequency && 
                            event.recurrence?.frequency !== 'none';

    if (isRecurringEvent && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      const occurrenceStartDate = new Date(occurrenceDate);
      const originalStartDate = new Date(event.start_time);
      const originalEndDate = new Date(event.end_time);
      
      // Calculate the duration and apply it to the occurrence
      const duration = originalEndDate.getTime() - originalStartDate.getTime();
      const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);

      // Create a new SINGLE (non-recurring) event for this specific occurrence
      const separateEvent = await Events.create({
        creator: event.creator,
        event_picture: event.event_picture,
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        start_time: occurrenceStartDate,
        end_time: occurrenceEndDate,
        capacity: event.capacity,
        recurrence: { checked: false, frequency: null, end_date: null }, // Make it NON-recurring
        attendees: event.attendees.map(att => ({
          user: att.user,
          status: att.user.toString() === req.user._id.toString() ? status : att.status
        })),
        visibility: event.visibility,
        excludedDates: [] // Single events don't need excludedDates
      });

      // Add this date to the master event's excludedDates if not already present
      if (!event.excludedDates.some(date => 
        new Date(date).toDateString() === occurrenceStartDate.toDateString()
      )) {
        event.excludedDates.push(occurrenceStartDate);
        await event.save();
      }

      // Add the new separate event to the user's events list
      const user = await User.findById(req.user._id);
      user.events.push({ event: separateEvent._id, status });
      await user.save();

      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status} this specific event occurrence`,
        status,
        separateEventId: separateEvent._id,
        occurrenceDate: occurrenceStartDate
      });

    } else if (isRecurringEvent && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      event.attendees[attendeeIndex].status = status;
      await event.save();

      // Update user's events list
      const user = await User.findById(req.user._id);
      const userEventIndex = user.events.findIndex(
        userEvent => userEvent.event.toString() === eventId
      );

      if (userEventIndex !== -1) {
        user.events[userEventIndex].status = status;
      } else {
        user.events.push({ event: eventId, status });
      }

      await user.save();

      return res.status(200).json({ 
        success: true, 
        message: `Successfully ${status} all future occurrences of this event`,
        status 
      });
    } else {
      // Handle non-recurring events or regular recurring event responses
      event.attendees[attendeeIndex].status = status;
      await event.save();

      // Update user's events list
      const user = await User.findById(req.user._id);
      const userEventIndex = user.events.findIndex(
        userEvent => userEvent.event.toString() === eventId
      );

      if (userEventIndex !== -1) {
        user.events[userEventIndex].status = status;
      } else {
        user.events.push({ event: eventId, status });
      }

      await user.save();

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
    }

  } catch (error) {
    console.error('Error in respondToEventInvitation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cancelEvent = async (req, res) => {
  try {
    const { eventId, occurrenceDate, modifyType } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator of the event
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the event creator can cancel the event' });
    }

    // Check if this is a recurring event
    const isRecurringEvent = event.recurrence?.checked && 
                            event.recurrence?.frequency && 
                            event.recurrence?.frequency !== 'none';

    if (isRecurringEvent && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      const occurrenceStartDate = new Date(occurrenceDate);
      
      // Add this date to the master event's excludedDates if not already present
      if (!event.excludedDates.some(date => 
        new Date(date).toDateString() === occurrenceStartDate.toDateString()
      )) {
        event.excludedDates.push(occurrenceStartDate);
        await event.save();
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully cancelled this specific event occurrence',
        cancelledDate: occurrenceStartDate
      });

    } else if (isRecurringEvent && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      // Set the recurrence end date to today to stop future occurrences
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      event.recurrence.end_date = today;
      await event.save();

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully cancelled all future occurrences of this event'
      });
    } else {
      // Handle non-recurring events or cancel entire recurring series
      // Set event status to cancelled instead of deleting
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
    }

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



    res.status(200).json({ 
      success: true,
      message: `Successfully deleted ${deletionResult.deletedCount} recurring events and updated ${userUpdateResult.modifiedCount} users`,
      deletedCount: deletionResult.deletedCount,
      usersUpdated: userUpdateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error deleting recurring events:', error);
    res.status(500).json({ message: 'Server error while deleting recurring events' });
  }
};

const inviteEventAttendees = async (req, res) => {
  
  try {
    const { eventId } = req.params;
    const { invitees, occurrenceDate, modifyType, inviteToAllOccurrences } = req.body;

    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return res.status(400).json({ message: 'Invalid invitees list' });
    }

    // Get the event and check if user has permission
    const event = await Events.findById(eventId).populate('creator');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator or an accepted attendee
    const isCreator = event.creator._id.toString() === req.user._id.toString();
    const isAcceptedAttendee = event.attendees.some(
      att => att.user.toString() === req.user._id.toString() && att.status === 'accepted'
    );

    if (!isCreator && !isAcceptedAttendee) {
      return res.status(403).json({ message: 'Not authorized to invite attendees' });
    }

    // Check if this is a recurring event and we have modification options
    const isRecurringEvent = event.recurrence?.checked && 
                            event.recurrence?.frequency && 
                            event.recurrence?.frequency !== 'none';

    if (isRecurringEvent && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      const occurrenceStartDate = new Date(occurrenceDate);
      const originalStartDate = new Date(event.start_time);
      const originalEndDate = new Date(event.end_time);
      
      // Calculate the duration and apply it to the occurrence
      const duration = originalEndDate.getTime() - originalStartDate.getTime();
      const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);

      // Create attendees list with existing attendees + new invitees
      const newInvitees = invitees.map(userId => ({
        user: userId,
        status: 'pending'
      }));
      
      const updatedAttendees = [...event.attendees, ...newInvitees];

      // Create a new SINGLE (non-recurring) event for this specific occurrence
      const separateEvent = await Events.create({
        creator: event.creator,
        event_picture: event.event_picture,
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        start_time: occurrenceStartDate,
        end_time: occurrenceEndDate,
        capacity: event.capacity,
        recurrence: { checked: false, frequency: null, end_date: null }, // Make it NON-recurring
        attendees: updatedAttendees,
        visibility: event.visibility,
        excludedDates: [] // Single events don't need excludedDates
      });

      // Add this date to the master event's excludedDates if not already present
      if (!event.excludedDates.some(date => 
        new Date(date).toDateString() === occurrenceStartDate.toDateString()
      )) {
        event.excludedDates.push(occurrenceStartDate);
        await event.save();
      }

      // Add the new separate event to all attendees' events lists (existing + new)
      for (const attendee of updatedAttendees) {
        const user = await User.findById(attendee.user);
        if (user) {
          // Add the new separate event with their status
          user.events.push({ event: separateEvent._id, status: attendee.status });
          await user.save();
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully invited attendees to this specific event occurrence',
        separateEventId: separateEvent._id,
        occurrenceDate: occurrenceStartDate,
        attendees: separateEvent.attendees
      });

    } else if (isRecurringEvent && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      // Add invitees to the master event
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
    } else {
      // Handle non-recurring events or legacy inviteToAllOccurrences parameter
      // For backward compatibility, also handle the old inviteToAllOccurrences parameter
      if (inviteToAllOccurrences && event.recurrence?.checked) {
        // Legacy behavior - treat as "all future events"
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
    }

  } catch (error) {
    console.error('Error in inviteEventAttendees:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEventsByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    // Get user friends, reported events, and not interested events
    const user = await User.findById(req.user._id).select('friends reported_events not_interested_events');
    const friends = user.friends || [];
    const reportedEventIds = (user.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user.not_interested_events || []).map(item => item.event.toString());
    

    // Get current date and time
    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    // Find all events in this category that are either:
    // 1. Public events
    // 2. Private events created by friends or the user
    // 3. Selected events where the user is an attendee
    const events = await Events.find({
      category,
      status: { $ne: 'cancelled' },
      _id: { $nin: [...reportedEventIds, ...notInterestedEventIds] }, // Exclude reported and not interested events
      $and: [
        {
          $or: [
            { visibility: 'public' },
            { 
              visibility: 'private',
              creator: { $in: [...friends, req.user._id] }
            },
            {
              visibility: 'selected',
              'attendees.user': req.user._id
            }
          ]
        },
        {
          $or: [
            // Non-recurring events that haven't ended yet
            {
              $and: [
                { 'recurrence.checked': { $ne: true } },
                { end_time: { $gte: now } }
              ]
            },
            // Recurring events that haven't reached their end date
            {
              $and: [
                { 'recurrence.checked': true },
                { 'recurrence.frequency': { $ne: 'none' } },
                {
                  $or: [
                    { 'recurrence.end_date': { $exists: false } },
                    { 'recurrence.end_date': { $gte: now } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    .populate('creator', 'first_name last_name username full_name profile_picture')
    .populate('attendees.user', 'first_name last_name username full_name profile_picture');

    // Process events to get upcoming occurrences
    const processedEvents = [];
    
    for (const event of events) {
      const isRecurring = event.recurrence?.checked &&
                         event.recurrence?.frequency &&
                         event.recurrence?.frequency !== 'none';

      if (isRecurring) {
        // For recurring events, generate upcoming occurrences
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        const recurrenceEndDate = event.recurrence.end_date ? new Date(event.recurrence.end_date) : futureLimit;
        
        if (recurrenceEndDate < now) continue;

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
        const upcomingOccurrences = rule.between(now, futureLimit, true);
        
        // Create event objects for each upcoming occurrence
        for (const occurrenceDate of upcomingOccurrences) {
          // Skip if this date is excluded
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration of the original event
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            processedEvents.push({
              ...event.toObject(),
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`,
              originalEventId: event._id,
              isRecurringOccurrence: true
            });
          }
        }
      } else {
        // For non-recurring events, just check if they haven't ended
        const end = new Date(event.end_time);
        if (end >= now) {
          processedEvents.push(event.toObject());
        }
      }
    }

    // Sort events by start time
    processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Add user-specific fields to each event
    const eventsWithUserStatus = processedEvents.map(event => {
      const userAttendee = event.attendees?.find(att => 
        att.user._id.toString() === req.user._id.toString()
      );
      const isCreator = event.creator._id.toString() === req.user._id.toString();
      const isFriendEvent = friends.some(friendId => 
        friendId.toString() === event.creator._id.toString()
      );

      return {
        ...event,
        isUserAttending: !!userAttendee,
        isUserInvited: !!userAttendee,
        isUserCreator: isCreator,
        isFriendEvent: isFriendEvent,
        userStatus: userAttendee?.status || null
      };
    });

    res.status(200).json(eventsWithUserStatus);
  } catch (error) {
    console.error('Error in getEventsByCategory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEventsByCity = async (req, res) => {
  const { city } = req.params;

  try {
    // Get user friends, reported events, and not interested events
    const user = await User.findById(req.user._id).select('friends reported_events not_interested_events');
    const friends = user.friends || [];
    const reportedEventIds = (user.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user.not_interested_events || []).map(item => item.event.toString());
  

    // Get current date and time
    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    // Find all events in this city that are either:
    // 1. Public events
    // 2. Private events created by friends or the user
    // 3. Selected events where the user is an attendee
    const events = await Events.find({
      'location.city': { $regex: new RegExp('^' + city + '$', 'i') }, // Case-insensitive exact match
      status: { $ne: 'cancelled' },
      _id: { $nin: [...reportedEventIds, ...notInterestedEventIds] }, // Exclude reported and not interested events
      $and: [
        {
          $or: [
            { visibility: 'public' },
            { 
              visibility: 'private',
              creator: { $in: [...friends, req.user._id] }
            },
            {
              visibility: 'selected',
              'attendees.user': req.user._id
            }
          ]
        },
        {
          $or: [
            // Non-recurring events that haven't ended yet
            {
              $and: [
                { 'recurrence.checked': { $ne: true } },
                { end_time: { $gte: now } }
              ]
            },
            // Recurring events that haven't reached their end date
            {
              $and: [
                { 'recurrence.checked': true },
                { 'recurrence.frequency': { $ne: 'none' } },
                {
                  $or: [
                    { 'recurrence.end_date': { $exists: false } },
                    { 'recurrence.end_date': { $gte: now } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
    .populate('creator', 'first_name last_name username full_name profile_picture')
    .populate('attendees.user', 'first_name last_name username full_name profile_picture');

    // Process events to get upcoming occurrences
    const processedEvents = [];
    
    for (const event of events) {
      const isRecurring = event.recurrence?.checked &&
                         event.recurrence?.frequency &&
                         event.recurrence?.frequency !== 'none';

      if (isRecurring) {
        // For recurring events, generate upcoming occurrences
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        const recurrenceEndDate = event.recurrence.end_date ? new Date(event.recurrence.end_date) : futureLimit;
        
        if (recurrenceEndDate < now) continue;

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
        const upcomingOccurrences = rule.between(now, futureLimit, true);
        
        // Create event objects for each upcoming occurrence
        for (const occurrenceDate of upcomingOccurrences) {
          // Skip if this date is excluded
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration of the original event
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            processedEvents.push({
              ...event.toObject(),
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`,
              originalEventId: event._id,
              isRecurringOccurrence: true
            });
          }
        }
      } else {
        // For non-recurring events, just check if they haven't ended
        const end = new Date(event.end_time);
        if (end >= now) {
          processedEvents.push(event.toObject());
        }
      }
    }

    // Sort events by start time
    processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Add user-specific fields to each event
    const eventsWithUserStatus = processedEvents.map(event => {
      const userAttendee = event.attendees?.find(att => 
        att.user._id.toString() === req.user._id.toString()
      );
      const isCreator = event.creator._id.toString() === req.user._id.toString();
      const isFriendEvent = friends.some(friendId => 
        friendId.toString() === event.creator._id.toString()
      );

      return {
        ...event,
        isUserAttending: !!userAttendee,
        isUserInvited: !!userAttendee,
        isUserCreator: isCreator,
        isFriendEvent: isFriendEvent,
        userStatus: userAttendee?.status || null
      };
    });

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
    
    const user = await User.findById(req.user._id)
      .populate({
        path: 'events.event',
        match: { status: { $ne: 'cancelled' } },
        populate: [
          { path: 'creator', select: '_id full_name profile_picture' },
          {
            path: 'attendees.user',
            model: 'Users',
            select: '_id full_name profile_picture'
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

    const now = new Date();

    // Get events that need attention (pending or declined)
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

    // Process recurring events
    const processedEvents = [];

    for (const event of attentionEvents) {
      if (event.recurrence?.checked && event.recurrence.frequency !== 'none') {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const eventDuration = endTime.getTime() - startTime.getTime();

        // Create RRule for recurring events
        const rrule = new RRule({
          freq: RRule[event.recurrence.frequency.toUpperCase()],
          dtstart: startTime,
          until: event.recurrence.end_date ? new Date(event.recurrence.end_date) : null
        });

        // Get upcoming occurrences for next 30 days
        const upcomingOccurrences = rrule.between(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

        for (const occurrenceDate of upcomingOccurrences) {
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);
            
            processedEvents.push({
              ...event,
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`,
              originalEventId: event._id,
              isRecurringOccurrence: true
            });
          }
        }
      } else {
        processedEvents.push({
          ...event,
          isRecurringOccurrence: false
        });
      }
    }

    // Sort by start time
    processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Apply limit if request is from home screen
    const finalEvents = fromHomeScreen 
      ? processedEvents.slice(0, 3) 
      : processedEvents;

    res.status(200).json({ 
      events: finalEvents,
      // Add metadata to help frontend understand the response
      metadata: {
        fromHomeScreen,
        totalAvailable: processedEvents.length,
        returned: finalEvents.length
      }
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

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3963; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

// Find users within 50 miles of a given location
const findUsersWithin50Miles = async (eventLat, eventLng, excludeUserId) => {
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
        
        // 50 miles threshold
        if (distance <= 50) {
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

/**
 * Generates recurring event dates based on frequency
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

const getFriendsEvents = async (req, res) => {
  try {
    // Get user's friends, reported events, and not interested events
    const user = await User.findById(req.user._id).select('friends reported_events not_interested_events');
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
    
    const friends = user.friends || [];
    
    // Get current date and time
    const now = new Date();
    
    // Find events that are:
    // 1. Public events created by friends
    // 2. Private events created by friends if the user is invited
    // 3. Selected events if the user is invited
    const events = await Events.find({
      status: { $ne: 'cancelled' },
      end_time: { $gte: now },
      _id: { $nin: [...reportedEventIds, ...notInterestedEventIds] }, // Exclude reported and not interested events
      $and: [
        {
          $or: [
            // Public events created by friends
            { 
              visibility: 'public',
              creator: { $in: friends }
            },
            // Private events created by friends if user is invited
            { 
              visibility: 'private',
              creator: { $in: friends },
            },
            // Selected events if user is invited
            {
              visibility: 'selected',
              creator: { $in: friends },
              'attendees.user': req.user._id
            }
          ]
        }
      ]
    })
    .populate('creator', 'first_name last_name username full_name profile_picture')
    .populate('attendees.user', 'first_name last_name username full_name profile_picture')
    .sort({ start_time: 1 });

    const processedEvents = [];

    // Process each event to handle recurring events
    for (const event of events) {
      if (event.recurrence?.checked && event.recurrence.frequency && event.recurrence.frequency !== 'none') {
        // Handle recurring events - generate occurrences
        const eventStartTime = new Date(event.start_time);
        const eventEndTime = new Date(event.end_time);
        
        // Calculate recurrence end date (1 year from now if not specified)
        const recurrenceEndDate = event.recurrence.end_date 
          ? new Date(event.recurrence.end_date) 
          : new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        
        // Generate upcoming occurrences based on recurrence pattern
        const upcomingOccurrences = generateRecurringEventDates(
          eventStartTime,
          recurrenceEndDate,
          event.recurrence.frequency
        );
        
        // Create event objects for each upcoming occurrence
        for (const occurrenceDate of upcomingOccurrences) {
          // Skip if this date is excluded
          const isExcluded = event.excludedDates && event.excludedDates.some(excludedDate => 
            new Date(excludedDate).toDateString() === occurrenceDate.toDateString()
          );

          if (!isExcluded) {
            // Calculate the duration of the original event
            const eventDuration = eventEndTime.getTime() - eventStartTime.getTime();
            const occurrenceEndTime = new Date(occurrenceDate.getTime() + eventDuration);

            processedEvents.push({
              ...event.toObject(),
              start_time: occurrenceDate,
              end_time: occurrenceEndTime,
              _id: `${event._id}-${occurrenceDate.toISOString()}`,
              originalEventId: event._id,
              isRecurringOccurrence: true
            });
          }
        }
      } else {
        // For non-recurring events, just add them to the list
        processedEvents.push(event.toObject());
      }
    }

    // Sort events by start time
    processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Add user-specific fields to each event
    const eventsWithUserStatus = processedEvents.map(event => {
      const userAttendee = event.attendees?.find(att => 
        att.user._id.toString() === req.user._id.toString()
      );
      const isCreator = event.creator._id.toString() === req.user._id.toString();
      const isFriendEvent = friends.some(friendId => 
        friendId.toString() === event.creator._id.toString()
      );

      return {
        ...event,
        isUserAttending: !!userAttendee,
        isUserInvited: !!userAttendee,
        isUserCreator: isCreator,
        isFriendEvent: isFriendEvent,
        userStatus: userAttendee?.status || null
      };
    });

    res.json(eventsWithUserStatus);
  } catch (error) {
    console.error('Error in getFriendsEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinEvent = async (req, res) => {
  try {
    const { eventId, status } = req.body;
    
    if (!eventId || !status) {
      return res.status(400).json({ message: 'Event ID and status are required' });
    }

    if (!['accepted', 'maybe'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted or maybe' });
    }

    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is already in the attendees list
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex !== -1) {
      // User is already in the attendees list, just update their status
      event.attendees[attendeeIndex].status = status;
    } else {
      // User is not in the attendees list, add them
      event.attendees.push({
        user: req.user._id,
        status
      });
    }

    await event.save();

    // Update user's events list
    const user = await User.findById(req.user._id);
    const userEventIndex = user.events.findIndex(
      userEvent => userEvent.event.toString() === eventId
    );

    if (userEventIndex !== -1) {
      user.events[userEventIndex].status = status;
    } else {
      user.events.push({ event: eventId, status });
    }

    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: `Successfully ${status === 'accepted' ? 'joined' : 'marked as maybe for'} the event`,
      status 
    });
  } catch (error) {
    console.error('Error in joinEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markEventNotInterested = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Add the event to the user's not interested events list
    const user = await User.findById(req.user._id);
    
    // Check if the event is already in the not interested list
    const alreadyNotInterested = user.not_interested_events.some(
      item => item.event.toString() === eventId
    );

    if (!alreadyNotInterested) {
      user.not_interested_events.push({
        event: eventId,
        added_at: new Date()
      });
      await user.save();
    }

    // If the user is in the attendees list, remove them
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex !== -1) {
      event.attendees.splice(attendeeIndex, 1);
      await event.save();
    }

    // Remove the event from the user's events list if it exists
    const userEventIndex = user.events.findIndex(
      userEvent => userEvent.event.toString() === eventId
    );

    if (userEventIndex !== -1) {
      user.events.splice(userEventIndex, 1);
      await user.save();
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully marked event as not interested'
    });
  } catch (error) {
    console.error('Error in markEventNotInterested:', error);
    res.status(500).json({ message: 'Server error' });
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
    
    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the event creator can edit the event' });
    }

    // Find user's current attendance status for this event
    const userAttendee = event.attendees.find(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const userAttendanceStatus = userAttendee ? userAttendee.status : 'accepted';

    // Check if this is a recurring event
    const isRecurringEvent = event.recurrence?.checked && 
                            event.recurrence?.frequency && 
                            event.recurrence?.frequency !== 'none';

    // Handle recurring event modifications
    if (isRecurringEvent && occurrenceDate && modifyType) {
      if (modifyType === 'this_only') {
        // Create a new single event for this occurrence
        const occurrenceStartDate = new Date(occurrenceDate);
        const originalStartDate = new Date(event.start_time);
        const originalEndDate = new Date(event.end_time);
        
        // Calculate the duration and apply it to the occurrence
        const duration = originalEndDate.getTime() - originalStartDate.getTime();
        const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);
        
        // Create a separate event with the updated data - IMPORTANT: Don't include _id
        const separateEvent = await Events.create({
          creator: event.creator,
          event_picture: eventData.event_picture || event.event_picture,
          title: eventData.title || event.title,
          category: eventData.category || event.category,
          description: eventData.description || event.description,
          location: eventData.location || event.location,
          start_time: occurrenceStartDate,
          end_time: occurrenceEndDate,
          capacity: eventData.capacity !== undefined ? eventData.capacity : event.capacity,
          recurrence: { checked: false, frequency: null, end_date: null }, // Make it non-recurring
          attendees: event.attendees,
          visibility: eventData.visibility || event.visibility,
          excludedDates: [], // Single events don't need excludedDates
          status: 'upcoming' // Ensure status is set to upcoming
        });
        
        // Add this date to excludedDates in the original recurring event
        if (!event.excludedDates.some(date => 
          new Date(date).toDateString() === occurrenceStartDate.toDateString()
        )) {
          event.excludedDates.push(occurrenceStartDate);
          await event.save();
        }

        // Add the new event to the user's events list with their original status
        const user = await User.findById(req.user._id);
        user.events.push({ event: separateEvent._id, status: userAttendanceStatus });
        await user.save();

        return res.status(200).json({ 
          success: true, 
          message: 'Successfully updated this occurrence',
          event: separateEvent
        });
      } 
      else if (modifyType === 'this_and_future') {
        // Update the recurrence end date to be the day before this occurrence
        const occurrenceStartDate = new Date(occurrenceDate);
        const dayBefore = new Date(occurrenceStartDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        
        // Update end date of the original event
        event.recurrence.end_date = dayBefore;
        await event.save();
        
        // Create a new recurring event for future occurrences with updated data - IMPORTANT: Don't include _id
        const newRecurringEvent = await Events.create({
          creator: event.creator,
          event_picture: eventData.event_picture || event.event_picture,
          title: eventData.title || event.title,
          category: eventData.category || event.category,
          description: eventData.description || event.description,
          location: eventData.location || event.location,
          start_time: occurrenceStartDate,
          end_time: eventData.end_time || event.end_time,
          capacity: eventData.capacity !== undefined ? eventData.capacity : event.capacity,
          recurrence: eventData.recurrence || event.recurrence,
          attendees: event.attendees,
          visibility: eventData.visibility || event.visibility,
          excludedDates: event.excludedDates ? [...event.excludedDates] : [],
          status: 'upcoming' // Ensure status is set to upcoming
        });

        // Add the new event to the user's events list with their original status
        const user = await User.findById(req.user._id);
        user.events.push({ event: newRecurringEvent._id, status: userAttendanceStatus });
        await user.save();
        
        return res.status(200).json({
          success: true,
          message: 'Successfully updated this and future occurrences',
          event: newRecurringEvent
        });
      }
      else if (modifyType === 'all_instances') {
        // Update the entire recurring event
        // Don't allow changing of creator, _id fields
        delete eventData._id;
        delete eventData.creator;
        
        Object.assign(event, eventData);
        await event.save();

        // Send update notifications to all attendees
        try {
          const attendeeIds = event.attendees.map(attendee => attendee.user);
          await createEventUpdateNotification(eventId, req.user._id, attendeeIds);
        } catch (notificationError) {
          console.error('Error sending event update notifications:', notificationError);
          // Don't fail the update if notification fails
        }
        
        return res.status(200).json({
          success: true,
          message: 'Successfully updated all occurrences',
          event
        });
      }
    }
    
    // For non-recurring events, simply update
    // Don't allow changing of creator, _id fields
    delete eventData._id;
    delete eventData.creator;
    
    Object.assign(event, eventData);
    await event.save();

    // Send update notifications to all attendees
    try {
      const attendeeIds = event.attendees.map(attendee => attendee.user);
      await createEventUpdateNotification(eventId, req.user._id, attendeeIds);
    } catch (notificationError) {
      console.error('Error sending event update notifications:', notificationError);
      // Don't fail the update if notification fails
    }
    
    return res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Error in updateEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const removeEventAttendee = async (req, res) => {
  try {
    const { eventId, attendeeId, occurrenceDate, modifyType } = req.body;
    
    if (!eventId || !attendeeId) {
      return res.status(400).json({ message: 'Event ID and attendee ID are required' });
    }

    // Find the event
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Verify the requester is the event creator
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only event creator can remove attendees' });
    }

    // Check if attendee is in the attendees list
    const attendeeIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === attendeeId.toString()
    );

    if (attendeeIndex === -1) {
      return res.status(404).json({ message: 'Attendee is not in this event' });
    }

    // Check if this is a recurring event and we have modification options
    const isRecurringEvent = event.recurrence?.checked && 
                            event.recurrence?.frequency && 
                            event.recurrence?.frequency !== 'none';

    if (isRecurringEvent && occurrenceDate && modifyType === 'this_only') {
      // Handle "this event only" for recurring events
      const occurrenceStartDate = new Date(occurrenceDate);
      const originalStartDate = new Date(event.start_time);
      const originalEndDate = new Date(event.end_time);
      
      // Calculate the duration and apply it to the occurrence
      const duration = originalEndDate.getTime() - originalStartDate.getTime();
      const occurrenceEndDate = new Date(occurrenceStartDate.getTime() + duration);

      // Create attendees list without the removed attendee
      const updatedAttendees = event.attendees.filter(
        attendee => attendee.user.toString() !== attendeeId.toString()
      );

      // Create a new SINGLE (non-recurring) event for this specific occurrence
      const separateEvent = await Events.create({
        creator: event.creator,
        event_picture: event.event_picture,
        title: event.title,
        category: event.category,
        description: event.description,
        location: event.location,
        start_time: occurrenceStartDate,
        end_time: occurrenceEndDate,
        capacity: event.capacity,
        recurrence: { checked: false, frequency: null, end_date: null }, // Make it NON-recurring
        attendees: updatedAttendees,
        visibility: event.visibility,
        excludedDates: [] // Single events don't need excludedDates
      });

      // Add this date to the master event's excludedDates if not already present
      if (!event.excludedDates.some(date => 
        new Date(date).toDateString() === occurrenceStartDate.toDateString()
      )) {
        event.excludedDates.push(occurrenceStartDate);
        await event.save();
      }

      // Add the new separate event to all remaining attendees' events lists
      for (const attendee of updatedAttendees) {
        const user = await User.findById(attendee.user);
        if (user) {
          // Add the new separate event with their original status
          user.events.push({ event: separateEvent._id, status: attendee.status });
          await user.save();
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from this specific event occurrence',
        separateEventId: separateEvent._id,
        occurrenceDate: occurrenceStartDate
      });

    } else if (isRecurringEvent && modifyType === 'all_future') {
      // Handle "all future events" for recurring events
      // Remove attendee from the master event
      event.attendees.splice(attendeeIndex, 1);
      await event.save();

      // Remove event from user's events list
      const user = await User.findById(attendeeId);
      if (user) {
        const userEventIndex = user.events.findIndex(
          userEvent => userEvent.event.toString() === eventId
        );

        if (userEventIndex !== -1) {
          user.events.splice(userEventIndex, 1);
          await user.save();
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from all future occurrences of this event'
      });
    } else {
      // Handle non-recurring events or regular recurring event removals
      // Remove attendee from event
      event.attendees.splice(attendeeIndex, 1);
      await event.save();

      // Remove event from user's events list
      const user = await User.findById(attendeeId);
      if (user) {
        const userEventIndex = user.events.findIndex(
          userEvent => userEvent.event.toString() === eventId
        );

        if (userEventIndex !== -1) {
          user.events.splice(userEventIndex, 1);
          await user.save();
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully removed attendee from the event'
      });
    }

  } catch (error) {
    console.error('Error in removeEventAttendee:', error);
    res.status(500).json({ message: 'Server error' });
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
