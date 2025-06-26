const mongoose = require('mongoose');
const Events = mongoose.model('Events');
const Users = mongoose.model('Users');

const handleEventShare = async (req, res) => {
  try {
    const { event_id } = req.params;
    const event = await Events.findById(event_id)
      .populate('creator', 'full_name profile_picture')
      .populate('attendees.user', 'full_name profile_picture');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if event is private
    if (event.visibility === 'private') {
      return res.status(403).json({ error: 'This event is private' });
    }

    // For web preview
    const isApp = req.headers['user-agent']?.includes('Kinovo');
    if (!isApp) {
      return res.render('eventShare', {
        event: {
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          creator: event.creator,
          category: event.category,
          attendees: event.attendees
        },
        appStoreUrl: 'YOUR_APP_STORE_URL'
      });
    }

    // For app deep linking
    return res.json({
      type: 'event',
      id: event_id,
      deepLink: `kinovo://event/${event_id}`
    });
  } catch (error) {
    console.error('Error in handleEventShare:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const handleProfileShare = async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await Users.findById(user_id)
      .select('full_name profile_picture bio favorite_activities');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For web preview
    const isApp = req.headers['user-agent']?.includes('Kinovo');
    if (!isApp) {
      return res.render('profileShare', {
        user: {
          full_name: user.full_name,
          profile_picture: user.profile_picture,
          bio: user.bio,
          favorite_activities: user.favorite_activities
        },
        appStoreUrl: 'YOUR_APP_STORE_URL'
      });
    }

    // For app deep linking
    return res.json({
      type: 'profile',
      id: user_id,
      deepLink: `kinovo://profile/${user_id}`
    });
  } catch (error) {
    console.error('Error in handleProfileShare:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  handleEventShare,
  handleProfileShare
}; 