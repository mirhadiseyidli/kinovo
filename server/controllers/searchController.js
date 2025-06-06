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
    
    console.log('Search events - userId:', userId, 'term:', term); // Debug log
    
    if (!term) {
      return res.status(400).json({ error: 'Search term is required.' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Debug: Check if any events with 'test' exist at all
    const allTestEvents = await Events.find({
      title: { $regex: term, $options: 'i' }
    });
    console.log('All events matching term:', allTestEvents.map(e => ({ 
      title: e.title, 
      visibility: e.visibility, 
      creator: e.creator,
      _id: e._id 
    }))); // Debug log

    // Fetch the user's friends (assumes `friends` is an array of ObjectIds on the user schema)
    const user = await User.findById(userId).select('friends');
    const friendIds = user?.friends || [];
    
    console.log('User friends:', friendIds); // Debug log

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
        }
      ]
    };
    
    console.log('Events query:', JSON.stringify(query, null, 2)); // Debug log
    
    const events = await Events.find(query).sort({ start_time: 1 });
    
    console.log('Found events:', events.length); // Debug log
    console.log('Events:', events.map(e => ({ title: e.title, visibility: e.visibility, creator: e.creator }))); // Debug log

    res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching relevant events:', err);
    res.status(500).json({ error: 'Server error while fetching events.' });
  }
};

module.exports = { searchPeople, searchRelevantEvents };
