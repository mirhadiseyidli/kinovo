const cron = require('node-cron');
const Event = require('../database/schemas/eventsSchema');
const User = require('../database/schemas/usersSchema');
const { createNearbyEventNotification } = require('../controllers/notificationsController');

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
};

const toRad = (value) => {
  return (value * Math.PI) / 180;
};

// Find users within 50 miles of an event
const findUsersWithin50Miles = async (eventLat, eventLng, excludeUserId, eventCreatorId) => {
  try {
    // Get all users with location data, excluding event creator and existing attendees
    const users = await User.find({
      _id: { 
        $ne: excludeUserId,
        $ne: eventCreatorId 
      },
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

// Cron job that runs every 6 hours to randomly send nearby event notifications
const startNearbyEventsCron = () => {
  // Run every 6 hours (at 00:00, 06:00, 12:00, 18:00)
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running nearby events cron job...');
    
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

      console.log(`Found ${upcomingPublicEvents.length} upcoming public events with locations`);

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
            console.log(`Sent nearby event notifications for "${event.title}" to ${usersToNotify.length} users`);
          } else {
            console.log(`No eligible users found for event "${event.title}"`);
          }
        } catch (error) {
          console.error(`Failed to send nearby notifications for event ${event._id}:`, error);
        }
      }

      console.log('Nearby events cron job completed');
    } catch (error) {
      console.error('Error in nearby events cron job:', error);
    }
  });

  console.log('Nearby events cron job scheduled to run every 6 hours');
};

module.exports = {
  startNearbyEventsCron
}; 