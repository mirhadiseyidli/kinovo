// Load environment variables
require('dotenv').config();
const axios = require('axios');

// Set Lambda environment variable for proper detection
process.env.AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME || 'SendEventReminder';

// Import optimized database connection
const { connectToDatabase } = require('./database/connection');
require('./config/firebase-admin');

// Import the existing notification helper
const {
  createEventReminderNotification,
} = require('./controllers/notificationsController');

/**
 * AWS Lambda handler invoked by EventBridge Scheduler.
 * Expects a JSON payload that includes the target `eventId`.
 *
 * EventBridge Scheduler sends the Input field directly as the event object.
 */
module.exports.handler = async (event = {}) => {
  const res = await axios.get('https://checkip.amazonaws.com');
  
  let eventId;
  let userId;
  let reminderType;

  try {
    // EventBridge Scheduler sends the Input directly as the event object
    // So we should access eventId, userId and reminderType directly from the event
    eventId = event.eventId;
    userId = event.userId;
    reminderType = event.reminderType;
    
    // Fallback: try other possible formats for compatibility
    if (!eventId) {
      const payload = typeof event.detail === 'string'
        ? JSON.parse(event.detail)
        : event.detail || JSON.parse(event.body || '{}');
      
      eventId = payload.eventId;
      userId = payload.userId;
      reminderType = payload.reminderType;
    }
  } catch (err) {
    console.error('Failed to parse Scheduler payload:', err);
  }

  if (!eventId) {
    console.error('SendEventReminder Lambda received no eventId. Event:', JSON.stringify(event, null, 2));
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Missing eventId' }),
    };
  }

  try {
    // Establish database connection with optimized settings
    await connectToDatabase();

    // Default to 1-hour reminder for backward compatibility
    const notificationReminderType = reminderType === '10min' ? 'event_reminder_10_mins' : 'event_reminder_1_hour';
    
    if (userId) {
      // New user-specific reminder handling
      await createEventReminderNotification(eventId, notificationReminderType, userId);
    } else {
      // Backward compatibility - send to all accepted attendees
      await createEventReminderNotification(eventId, notificationReminderType);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Reminder sent successfully' }),
    };
  } catch (err) {
    console.error(`Error sending reminder for event ${eventId}:`, err);
    // Propagate the error so Lambda marks the invocation as failed
    throw err;
  }
}; 