const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const { getUserFilterData, buildEventFilter, processEventsForDiscovery, enrichEventsWithUserData } = require('../utils/eventUtils');

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

    // Get user filter data using utility from eventUtils
    const filterData = await getUserFilterData(userId);

    // Build event filter using eventUtils utility with search-specific filters
    const eventFilter = buildEventFilter(filterData, { 
      includePublic: true,
      includePrivateFriends: true,
      includeSelected: true,
      userId: userId
    });

    // Add search term filters to the built filter
    eventFilter.$and = eventFilter.$and || [];
    eventFilter.$and.push({
      $or: [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ]
    });

    // Find events using the built filter with population
    const events = await Events.find(eventFilter)
      .populate('creator', 'first_name last_name username full_name profile_picture')
      .populate('attendees.user', 'first_name last_name username full_name profile_picture')
      .lean();

    // Process events for discovery - show only next occurrence of recurring events, handle cancelled events
    const processedEvents = processEventsForDiscovery(events, {
      excludeUserAttending: false,
      userId: userId
    });

    // Add user-specific fields using utility
    const eventsWithUserStatus = enrichEventsWithUserData(processedEvents, userId, filterData.friends);

    // Sort by start time
    eventsWithUserStatus.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    res.status(200).json(eventsWithUserStatus);
  } catch (err) {
    console.error('Error fetching relevant events:', err);
    res.status(500).json({ error: 'Server error while fetching events.' });
  }
};

module.exports = { searchPeople, searchRelevantEvents };
