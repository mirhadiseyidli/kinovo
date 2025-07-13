// Load environment variables
require('dotenv').config();

// Ensure a MongoDB connection is established for each cold start
// require('./database/connection');

// Import the existing notification helper
const {
  createEventReminderNotification,
} = require('../controllers/notificationsController');

/**
 * AWS Lambda handler invoked by EventBridge Scheduler.
 * Expects a JSON payload that includes the target `eventId`.
 *
 * The Scheduler payload is supplied under `event.detail` for version-2 targets.
 * For backwards compatibility, we also check `event.body`.
 */
module.exports.handler = async (event = {}) => {
  let eventId;

  try {
    const payload = typeof event.detail === 'string'
      ? JSON.parse(event.detail)
      : event.detail || JSON.parse(event.body || '{}');

    eventId = payload.eventId;
  } catch (err) {
    console.error('Failed to parse Scheduler payload:', err);
  }

  if (!eventId) {
    console.error('SendEventReminder Lambda received no eventId');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing eventId' }),
    };
  }

  try {
    await createEventReminderNotification(eventId);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reminder sent' }),
    };
  } catch (err) {
    console.error(`Error sending reminder for event ${eventId}:`, err);
    // Propagate the error so Lambda marks the invocation as failed
    throw err;
  }
}; 