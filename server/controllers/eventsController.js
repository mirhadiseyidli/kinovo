const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const EventOccurrence = require('../database/schemas/eventOccurenceSchema');
const { RRule } = require('rrule');
const { createEventCreationNotification } = require('./notificationsController');

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

    const attendeesWithStatus = (attendees || []).map(({ user }) => ({
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

    // Send notifications to friends for public and private events
    if ((visibility === 'public' || visibility === 'private') && creator.friends.length > 0) {
      try {
        console.log(`Creating event notifications for ${creator.friends.length} friends for event: ${event.title}`);
        const notifications = await createEventCreationNotification(event._id, req.user._id, creator.friends);
        console.log(`Successfully created ${notifications.length} event notifications`);
      } catch (notificationError) {
        console.error('Error sending event creation notifications:', notificationError);
        // Don't fail the event creation if notifications fail
      }
    } else {
      console.log(`Not sending notifications - visibility: ${visibility}, friends count: ${creator.friends.length}`);
    }

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
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
        (userEvent.status === 'accepted' || userEvent.status === 'maybe')
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
    const user = await User.findById(req.user._id).populate({
      path: 'events.event',
      match: { status: { $ne: 'cancelled' } },
      select: 'title start_time recurrence status'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); 

    const allUserEvents = (user.events || [])
      .filter(e => e.event) // Include all events regardless of status
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

    const user = await User.findById(req.user._id).populate({
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

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const allUserEvents = (user.events || [])
      .filter(e => e.event) // Include all events regardless of status
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

// const getMyEventsCalendarMonthView = async (req, res) => {
//   try {
//     // Fetch the user and populate only the needed event fields.
//     const user = await User.findById(req.user._id).populate({
//       path: 'events.event',
//       select: 'title start_time recurrence'
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Determine the center month dynamically using query parameters if provided.
//     let centerDate = new Date();
//     console.log(req.query)
//     if (req.query.year && req.query.month) {
//       const year = Number(req.query.year);
//       const month = Number(req.query.month);
//       console.log('year', year);
//       console.log('month', month);
//       centerDate = new Date(year, month, 1);
//       console.log(new Date(year, month, 1))
//     }

//     // Define the date range for the view: from the start of the month before the center month to the end of the month after.
//     const pastMonthStart = new Date(centerDate.getFullYear(), centerDate.getMonth() - 1, 1);
//     const nextMonthEnd = new Date(centerDate.getFullYear(), centerDate.getMonth() + 2, 0);

//     console.log(pastMonthStart, centerDate, nextMonthEnd)

//     // Get all events linked to the user.
//     const allUserEvents = (user.events || [])
//       .filter(e => e.event)
//       .map(e => e.event);

//     console.log(allUserEvents)

//     let finalEvents = [];
//     // Track unique event occurrences to avoid duplicates.
//     const occurrenceSet = new Set();

//     for (const event of allUserEvents) {
//       const eventDate = new Date(event.start_time);
//       const recurrence = event.recurrence || {};
//       const isRecurring = recurrence.checked &&
//                           recurrence.frequency &&
//                           recurrence.frequency.toLowerCase() !== 'none';

//       if (!isRecurring) {
//         // For non-recurring events, include them if they fall within the defined date range.
//         if (eventDate >= pastMonthStart && eventDate <= nextMonthEnd) {
//           const normalizedEventDate = new Date(eventDate);
//           normalizedEventDate.setMilliseconds(0);
//           const key = `${event._id}-${normalizedEventDate.toISOString()}`;
//           if (!occurrenceSet.has(key)) {
//             finalEvents.push({
//               ...event.toObject(),
//               occurrence: normalizedEventDate
//             });
//             occurrenceSet.add(key);
//           }
//         }
//       } else {
//         // For recurring events, use RRule to compute each occurrence date in the range.
//         const freqMapping = {
//           daily: RRule.DAILY,
//           weekly: RRule.WEEKLY,
//           monthly: RRule.MONTHLY,
//           yearly: RRule.YEARLY
//         };
      
//         // Set rule options: if recurrence.end_date is provided, use it; otherwise, generate up to nextMonthEnd.
//         const ruleOptions = {
//           freq: freqMapping[recurrence.frequency.toLowerCase()],
//           dtstart: eventDate,
//           until: recurrence.end_date ? new Date(recurrence.end_date) : nextMonthEnd
//         };
      
//         const rule = new RRule(ruleOptions);
      
//         // Instead of using rule.between, compute the first occurrence after pastMonthStart,
//         // then continue iterating until nextMonthEnd.
//         let occurrenceDate = rule.after(pastMonthStart, true);
//         const occurrenceDates = [];
//         while (occurrenceDate && occurrenceDate <= nextMonthEnd) {
//           occurrenceDates.push(occurrenceDate);
//           occurrenceDate = rule.after(occurrenceDate);
//         }
      
//         for (const occDate of occurrenceDates) {
//           const normalizedOccDate = new Date(occDate);
//           normalizedOccDate.setMilliseconds(0);
//           const key = `${event._id}-${normalizedOccDate.toISOString()}`;
//           if (!occurrenceSet.has(key)) {
//             finalEvents.push({
//               ...event.toObject(),
//               occurrence: normalizedOccDate
//             });
//             occurrenceSet.add(key);
//           }
//         }
//       }
//     }

//     // Sort the final list of events by the occurrence date.
//     finalEvents.sort((a, b) => new Date(a.occurrence) - new Date(b.occurrence));

//     console.log(finalEvents)

//     return res.status(200).json({ events: finalEvents });
//   } catch (error) {
//     console.error('Error in getMyEventsCalendarMonthViewRRule:', error);
//     return res.status(500).json({ message: 'Server error' });
//   }
// };


// const movePastEventsForUser = async (userId) => {
//   const now = new Date();

//   const user = await User.findById(userId).populate('events');
//   if (!user) return;

//   // Separate upcoming and past events
//   const pastEvents = user.events.filter(event => event.start_time && new Date(event.start_time) < now);
//   const upcomingEvents = user.events.filter(event => event.start_time && new Date(event.start_time) >= now);

//   // Update user document
//   await User.findByIdAndUpdate(userId, {
//     $set: { events: upcomingEvents.map(e => e._id) },
//     $addToSet: { past_events: { $each: pastEvents.map(e => e._id) } }
//   });
// };

const getMyUpcomingEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
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

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    const allUpcomingOccurrences = [];

    // Process each user event
    for (const userEvent of user.events || []) {
      // Include events with 'accepted' or 'maybe' status
      const isIncluded = userEvent.status === 'accepted' || userEvent.status === 'maybe';
      const hasEvent = !!userEvent.event;
      if (!isIncluded || !hasEvent) continue;

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

    // Limit to 3 events for the upcoming events display
    const limitedEvents = allUpcomingOccurrences.slice(0, 3);

    if (limitedEvents.length === 0) {
      return res.status(201).json({ message: 'No events found', events: [] });
    }

    res.status(200).json({ events: limitedEvents });
  } catch (error) {
    console.error('Error in getMyUpcomingEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyPastEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
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

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();

    const pastEvents = (user.events || []).filter(e => {
      const isAccepted = e.status === 'accepted';
      const hasEvent = !!e.event;
      const isPast = hasEvent && new Date(e.event.end_time) < now;

      return isAccepted && isPast;
    }).map(e => e.event); // return the populated event

    if (!pastEvents || pastEvents.length === 0) {
      return res.status(201).json({ message: 'No events found', past_events: [] });
    }

    res.status(200).json({ past_events: pastEvents });
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// const cleanUpUserEvents = async () => {
//   const users = await User.find({}).select('events past_events');

//   for (const user of users) {
//     const uniqueEvents = [...new Set((user.events || []).map(e => String(e)))];
//     const uniquePastEvents = [...new Set((user.past_events || []).map(e => String(e)))];

//     await User.findByIdAndUpdate(user._id, {
//       $set: {
//         events: uniqueEvents,
//         past_events: uniquePastEvents
//       }
//     });
//   }

//   console.log('Duplicates cleaned up in all user event lists');
// };

const getUserEvents = async (req, res) => {
  try {
    const userId = req.params._id;
    const found_events = await User.findOne({ _id: userId }).populate({ path: 'events' });

  } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
};

const getEventById = async (req, res) => {
  try {
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
      res.status(404).json({ message: 'No event with that id was found'});
    };

    res.status(201).json({ found_event: found_event });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}


// const cleanUpUserEvents = async () => {
//   const VALID_STATUSES = ['pending', 'maybe', 'accepted', 'rejected'];
//   const users = await User.find({}).select('_id events');

//   for (const user of users) {
//     const cleanedEvents = (user.events || []).filter(e => {
//       return (
//         e.event &&
//         typeof e.event === 'object' && // not just _id with buffer
//         VALID_STATUSES.includes(e.status)
//       );
//     });

//     await User.findByIdAndUpdate(user._id, {
//       $set: { events: cleanedEvents }
//     });
//   }

//   console.log('✅ Cleaned up malformed event references.');
// };

// const deleteAllEvents = async () => {
//   try {
//     // Delete all events in the collection
//     const deletionResult = await Events.deleteMany({});
//     await User.updateMany({}, { $set: { events: [] } });
//     console.log(`✅ Successfully deleted ${deletionResult.deletedCount} events.`);
//   } catch (error) {
//     console.error('Error deleting all events:', error);
//   }
// };

const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, distance } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchDistance = parseFloat(distance) || 50; // Default to 50 miles if not provided
    
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Fetch user's friends
    const user = await User.findById(req.user._id).select('friends');
    const friends = user.friends || [];

    // Get current date and time
    const now = new Date();
    const futureLimit = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year from now

    // Query events: public or private and created by a friend
    const events = await Events.find({
      $and: [
        { status: { $ne: 'cancelled' } },
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
    });

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

// const getEventCategories = async (req, res) => {
//   try {
//     const categories = await Events.distinct('category', {
//       category: { $ne: null }
//     });

//     res.status(200).json({ categories });
//   } catch (error) {
//     console.error('Error fetching event categories:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

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
    
    console.log(`Found ${recurringEvents.length} recurring events to delete`);

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

    console.log(`✅ Successfully deleted ${deletionResult.deletedCount} recurring events`);
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} users' event lists`);

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
  console.log('her')
  try {
    const { eventId } = req.params;
    const { invitees, inviteToAllOccurrences } = req.body;

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

    // Handle recurring events
    if (inviteToAllOccurrences && event.recurrence?.checked) {
      // Get all occurrences
      const occurrences = await EventOccurrence.find({ originalEventId: eventId });
      
      // Add invitees to all occurrences
      for (const occurrence of occurrences) {
        await EventOccurrence.findByIdAndUpdate(occurrence._id, {
          $addToSet: {
            attendees: {
              $each: invitees.map(userId => ({ user: userId, status: 'pending' }))
            }
          }
        });
      }
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

    res.status(200).json({
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
  try {
    const { category } = req.params;
    console.log('Fetching events for category:', category);
    console.log('User ID:', req.user._id);

    // Get user's friends
    const user = await User.findById(req.user._id).select('friends');
    const friends = user.friends || [];
    
    console.log('User friends:', friends);

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
  try {
    const { city } = req.params;
    console.log('Fetching events for city:', city);
    console.log('User ID:', req.user._id);

    // Get user's friends
    const user = await User.findById(req.user._id).select('friends');
    const friends = user.friends || [];
    
    console.log('User friends:', friends);

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

    res.json(eventsWithUserStatus);
  } catch (error) {
    console.error('Error in getEventsByCity:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAttentionRequiredEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
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

    const now = new Date();

    // Get events that need attention (pending or declined)
    const attentionEvents = (user.events || [])
      .filter(userEvent => {
        // Make sure the event exists and hasn't been cancelled
        if (!userEvent.event || userEvent.event.status === 'cancelled') {
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

    res.status(200).json({ events: processedEvents });
  } catch (error) {
    console.error('Error in getAttentionRequiredEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRecommendedEvents = async (req, res) => {
  try {
    // Get user's preferences and friends
    const user = await User.findById(req.user._id)
      .select('favorite_activities location friends')
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
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
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
  getRecommendedEvents
};
