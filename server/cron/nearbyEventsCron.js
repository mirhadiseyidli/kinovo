const cron = require('node-cron');
const Event = require('../database/schemas/eventsSchema');
const User = require('../database/schemas/usersSchema');
const { createNearbyEventNotification, createEventCreationNotificationForFriends } = require('../controllers/notificationsController');

// Helper function to find users within 50 miles using MongoDB's geospatial queries
const findUsersWithin50Miles = async (lat, lng, excludeUserId = null, creatorId = null) => {
  try {
    const query = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: 80467.2 // 50 miles in meters (50 * 1609.344)
        }
      }
    };

    // Exclude the user making the request and the event creator
    const excludeIds = [excludeUserId, creatorId].filter(id => id !== null);
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    const users = await User.find(query).select('_id');
    return users.map(user => user._id);
  } catch (error) {
    console.error('Error finding nearby users:', error);
    return [];
  }
};


// Cron job that runs once daily to randomly send nearby event notifications
const startNearbyEventsCron = () => {
  // Run once daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      // Find public events happening in the next 3 days
      const upcomingPublicEvents = await Event.find({
        start_time: {
          $gte: now,
          $lte: threeDaysFromNow
        },
        visibility: 'public',
        status: { $ne: 'cancelled' },
        'location.coordinates.lat': { $exists: true, $ne: null },
        'location.coordinates.lng': { $exists: true, $ne: null }
      }).populate('creator', '_id').select('_id title start_time location creator attendees');


      // Randomly select up to 3 events to promote each run
      const eventsToPromote = upcomingPublicEvents
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      for (const event of eventsToPromote) {
        try {
          // Find users within 50 miles
          const nearbyUserIds = await findUsersWithin50Miles(
            event.location.coordinates.lat,
            event.location.coordinates.lng,
            null, // no specific user to exclude
            event.creator._id
          );

          // Filter out existing attendees
          const eventAttendeeIds = event.attendees.map(attendee => 
            attendee.user.toString()
          );
          
          const eligibleUsers = nearbyUserIds.filter(userId => 
            !eventAttendeeIds.includes(userId.toString())
          );

          if (eligibleUsers.length > 0) {
            // Randomly select up to 10 users to notify
            const usersToNotify = eligibleUsers
              .sort(() => 0.5 - Math.random())
              .slice(0, 10);

            await createNearbyEventNotification(event._id, usersToNotify);
          }
        } catch (error) {
          console.error(`Failed to send nearby notifications for event ${event._id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in nearby events cron job:', error);
    }
  });
};

// Cron job that runs once daily to send friends event notifications
const startFriendsEventsCron = () => {
  // Run once daily at 12 PM (noon)
  cron.schedule('0 12 * * *', async () => {
    
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      // Find all users with friends
      const usersWithFriends = await User.find({
        'friends': { $exists: true, $not: { $size: 0 } }
      }).select('_id friends').populate('friends', '_id');

      for (const user of usersWithFriends) {
        try {
          // Get friend IDs
          const friendIds = user.friends.map(friend => friend._id);
          
          if (friendIds.length === 0) continue;

          // Find events created by this user's friends in the next 3 days
          const friendsEvents = await Event.find({
            creator: { $in: friendIds },
            start_time: {
              $gte: now,
              $lte: threeDaysFromNow
            },
            status: { $ne: 'cancelled' },
            // Include both public and friends_only events
            visibility: { $in: ['public', 'friends_only'] }
          }).populate('creator', '_id name').select('_id title start_time creator attendees visibility');

          if (friendsEvents.length === 0) continue;

          // Filter events where the user is not already an attendee
          const eligibleEvents = friendsEvents.filter(event => {
            const attendeeIds = event.attendees.map(attendee => attendee.user.toString());
            return !attendeeIds.includes(user._id.toString());
          });

          if (eligibleEvents.length === 0) continue;

          // Randomly select up to 2 events to notify about (to avoid spam)
          const eventsToNotify = eligibleEvents
            .sort(() => 0.5 - Math.random())
            .slice(0, 2);

          // Create notifications for each selected event
          for (const event of eventsToNotify) {
            await createEventCreationNotificationForFriends(event._id, event.creator._id, [user._id]);
          }

        } catch (error) {
          console.error(`Failed to send friends event notifications for user ${user._id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in friends events cron job:', error);
    }
  });
};

module.exports = {
  startNearbyEventsCron,
  startFriendsEventsCron
}; 