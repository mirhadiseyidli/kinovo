const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');

const searchPeople = async (req, res) => {
    try {
        const term = req.query.query; // Search query from frontend

        if (!term) {
            return res.status(400).json({ error: 'Search term is required.' });
        }

        // Query both users and drones collections in parallel
        const users = await User.find({
            _id: { $ne: req.user._id },
            $or: [
                { email: { $regex: term, $options: 'i' } },
                { username: { $regex: term, $options: 'i' } },
                { first_name: { $regex: term, $options: 'i' } },
                { last_name: { $regex: term, $options: 'i' } },
                { full_name: { $regex: term, $options: 'i' } },
                { phone_number: { $regex: term, $options: 'i' } }
            ]
        });

        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to search users and drones' });
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

    // Fetch the user's friends (assumes `friends` is an array of ObjectIds on the user schema)
    const user = await User.findById(userId).select('friends');
    const friendIds = user?.friends || [];

    // Build the query with term matching on title and description
    const events = await Events.find({
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
    }).sort({ start_time: 1 });

    res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching relevant events:', err);
    res.status(500).json({ error: 'Server error while fetching events.' });
  }
};

module.exports = { searchPeople, searchRelevantEvents };
