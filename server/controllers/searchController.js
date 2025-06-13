const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');

const searchPeople = async (req, res) => {
    try {
        const term = req.query.query; // Search query from frontend

        if (!term) {
            return res.status(400).json({ error: 'Search term is required.' });
        }

        // Get current user with blocked users
        const currentUser = await User.findById(req.user._id).select('blocked_users');
        const blockedUserIds = currentUser.blocked_users.map(block => block.user.toString());

        // Query users collection excluding blocked users and users who blocked the current user
        const users = await User.find({
            _id: { $ne: req.user._id }, // Exclude self
            $and: [
                { _id: { $nin: blockedUserIds } }, // Exclude users that current user blocked
                { 'blocked_users.user': { $ne: req.user._id } }, // Exclude users who blocked current user
                {
                    $or: [
                        { email: { $regex: term, $options: 'i' } },
                        { username: { $regex: term, $options: 'i' } },
                        { first_name: { $regex: term, $options: 'i' } },
                        { last_name: { $regex: term, $options: 'i' } },
                        { full_name: { $regex: term, $options: 'i' } },
                        { phone_number: { $regex: term, $options: 'i' } }
                    ]
                }
            ]
        });

        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};

const searchRelevantEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    const term = req.query.query; // Extract search term from query
    
    if (!term) {
      return res.status(400).json({ error: 'Search term is required.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch the user's friends, reported events, and not interested events
    const user = await User.findById(userId).select('friends reported_events not_interested_events');
    const friendIds = user?.friends || [];
    const reportedEventIds = (user?.reported_events || []).map(event => event.toString());
    const notInterestedEventIds = (user?.not_interested_events || []).map(item => item.event.toString());

    // Build the query with term matching on title and description
    const query = {
      $and: [
        {
          $or: [
            { visibility: 'public' }, // public
            { visibility: 'private', creator: { $in: friendIds } }, // private if creator is a friend
            { visibility: 'select', 'attendees.user': userId } // select if user is in attendees
          ]
        },
        {
          $or: [
            { title: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } }
          ]
        },
        // Exclude reported events and not interested events
        { _id: { $nin: [...reportedEventIds, ...notInterestedEventIds] } }
      ]
    };
    
    const events = await Events.find(query).sort({ start_time: 1 });

    res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching relevant events:', err);
    res.status(500).json({ error: 'Server error while fetching events.' });
  }
};

module.exports = { searchPeople, searchRelevantEvents };
