const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const EventOccurrence = require('../database/schemas/eventOccurenceSchema');
const { RRule } = require('rrule');

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

    // Add this event to the user's events list with accepted status
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { events: { event: event._id, status: 'accepted' } }
    });

    // Add to friends' friend_event_history and event list with pending status
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

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'events',
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

    const acceptedEvents = (user.events || []).filter(event =>
      event.attendees.some(att => 
        att.user && att.user._id.toString() === req.user._id.toString() && att.status === 'accepted'
      )
    );

    if (!acceptedEvents || acceptedEvents.length === 0) {
      return res.status(200).json({ message: 'No events found', events: [] });
    }

    res.status(200).json({ events: acceptedEvents });
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEventsCalendarMonthView = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'events.event',
      select: 'title start_time recurrence'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); 
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0); 

    const allUserEvents = (user.events || [])
      .filter(e => e.event)
      .map(e => e.event);

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
    // await cleanUpUserEvents();
    const user = await User.findById(req.user._id).populate({
      path: 'events.event',
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

    const upcomingEvents = (user.events || []).filter(e => {
      const isAccepted = e.status === 'accepted';
      const hasEvent = !!e.event;
      if (!isAccepted || !hasEvent) return false;

      // Check if the event is recurring
      if (e.event.recurrence && e.event.recurrence.checked && e.event.recurrence.frequency && e.event.recurrence.frequency !== 'none') {
        // If an end_date is set, include only if it hasn't passed
        if (e.event.recurrence.end_date) {
          return new Date(e.event.recurrence.end_date) >= now;
        } else {
          // No end_date means it's indefinitely recurring
          return true;
        }
      } else {
        // Non-recurring event: include if the start_time is in the future
        const startTime = new Date(e.event.start_time);
        const endTime = new Date(e.event.end_time);
        return (startTime > now) || (startTime <= now && endTime >= now);
      }
    }).map(e => e.event); // return the populated event

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return res.status(201).json({ message: 'No events found', events: [] });
    }

    upcomingEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    res.status(200).json({ events: upcomingEvents });
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyPastEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'events.event',
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


const cleanUpUserEvents = async () => {
  const VALID_STATUSES = ['pending', 'maybe', 'accepted', 'rejected'];
  const users = await User.find({}).select('_id events');

  for (const user of users) {
    const cleanedEvents = (user.events || []).filter(e => {
      return (
        e.event &&
        typeof e.event === 'object' && // not just _id with buffer
        VALID_STATUSES.includes(e.status)
      );
    });

    await User.findByIdAndUpdate(user._id, {
      $set: { events: cleanedEvents }
    });
  }

  console.log('✅ Cleaned up malformed event references.');
};

const deleteAllEvents = async () => {
  try {
    // Delete all events in the collection
    const deletionResult = await Events.deleteMany({});
    await User.updateMany({}, { $set: { events: [] } });
    console.log(`✅ Successfully deleted ${deletionResult.deletedCount} events.`);
  } catch (error) {
    console.error('Error deleting all events:', error);
  }
};

const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }

    // Fetch user's friends
    const user = await User.findById(req.user._id).select('friends');
    const friends = user.friends || [];

    // Query events: public or private and created by a friend
    const events = await Events.find({
      $or: [
        { visibility: 'public' },
        { visibility: 'private', creator: { $in: friends } }
      ]
    });

    // Filter out events where user is already in attendees and past events
    const now = new Date();
    const filteredEvents = events.filter(event => {
      const isUserAttending = event.attendees.some(a => a.user.toString() === req.user._id.toString());
      if (isUserAttending) return false;
    
      const isRecurring = event.recurrence?.checked &&
                          event.recurrence?.frequency &&
                          event.recurrence?.frequency !== 'none';
    
      if (isRecurring) {
        return !event.recurrence.end_date || new Date(event.recurrence.end_date) >= now;
      } else {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        return start >= now || (start <= now && end >= now); // include ongoing events
      }
    });

    // Haversine formula
    const toRad = (value) => (value * Math.PI) / 180;
    const EARTH_RADIUS_MILES = 3958.8;

    const nearbyEvents = filteredEvents
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
      .filter(item => item && item.distance <= 50)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      events: nearbyEvents.map(item => ({
        ...item.event.toObject(),
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

module.exports = { 
  getMyEvents,
  getUserEvents,
  createEvent,
  getMyPastEvents,
  getMyUpcomingEvents,
  getMyEventsCalendarMonthView,
  getEventById,
  getNearbyEvents
};
