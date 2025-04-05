const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');

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
      attendees,
      visibility
    });

    // Add this event to the user's events list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { events: event._id }
    });

    // Add to friends' friend_event_history
    const creator = await User.findById(req.user._id).select('friends');
    for (const friendId of creator.friends) {
      await User.findByIdAndUpdate(friendId, {
        $addToSet: {
          friend_event_history: {
            friend: req.user._id,
            event: event._id,
            added_at: new Date()
          }
        }
      });
    }

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error('Error in createEvent:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyEvents = async (req, res) => {
  try {
    await movePastEventsForUser(req.user._id);
    const user = await User.findById(req.user._id).populate({
      path: 'events',
      populate: [
        { path: 'creator', select: '_id full_name profile_picture' },
        { path: 'attendees', select: '_id full_name profile_picture' }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.events || user.events.length === 0) {
      return res.status(200).json({ message: 'No events found', events: [] });
    }

    res.status(200).json({ events: user.events });
  } catch (error) {
    console.error('Error in getMyEvents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const movePastEventsForUser = async (userId) => {
  const now = new Date();

  const user = await User.findById(userId).populate('events');
  if (!user) return;

  // Separate upcoming and past events
  const pastEvents = user.events.filter(event => event.start_time && new Date(event.start_time) < now);
  const upcomingEvents = user.events.filter(event => event.start_time && new Date(event.start_time) >= now);

  // Update user document
  await User.findByIdAndUpdate(userId, {
    $set: { events: upcomingEvents.map(e => e._id) },
    $addToSet: { past_events: { $each: pastEvents.map(e => e._id) } }
  });
};

const getMyPastEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'past_events',
      populate: [
        { path: 'creator', select: '_id full_name profile_picture' },
        { path: 'attendees', select: '_id full_name profile_picture' }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.past_events || user.past_events.length === 0) {
      return res.status(200).json({ message: 'No events found', past_events: [] });
    }

    res.status(200).json({ past_events: user.past_events });
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
    const userId = req.params._id
    const found_events = await User.findOne({ _id: userId }).populate({ path: 'events' });

  } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { 
  getMyEvents,
  getUserEvents,
  createEvent,
  getMyPastEvents
};
