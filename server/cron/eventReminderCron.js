const cron = require('node-cron');
const Event = require('../database/schemas/eventsSchema');
const { createEventReminderNotification } = require('../controllers/notificationsController');

// Cron job that runs every hour to check for events starting in the next hour
const startEventReminderCron = () => {
  // Run every hour at minute 0 (e.g., 12:00, 1:00, 2:00)
  cron.schedule('0 * * * *', async () => {
    
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Find events starting within the next hour
      const upcomingEvents = await Event.find({
        start_time: {
          $gte: now,
          $lte: oneHourFromNow
        },
        status: { $ne: 'cancelled' }
      }).select('_id title start_time');

      // Send reminder notifications for each event
      for (const event of upcomingEvents) {
        try {
          await createEventReminderNotification(event._id);
        } catch (error) {
          console.error(`Failed to send reminder for event ${event._id}:`, error);
        }
      }

    } catch (error) {
      console.error('Error in event reminder cron job:', error);
    }
  });

};

module.exports = {
  startEventReminderCron
}; 