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

// Import efficient reminder scheduling
const {
  scheduleNextOccurrenceReminder
} = require('./utils/efficientReminderScheduling');

/**
 * AWS Lambda handler invoked by EventBridge Scheduler.
 * Expects a JSON payload that includes the target `eventId`.
 *
 * EventBridge Scheduler sends the Input field directly as the event object.
 */
module.exports.handler = async (event = {}) => {
  const res = await axios.get('https://checkip.amazonaws.com');
  
  let eventId;
  let reminderType;
  let occurrenceDate;

  try {
    // EventBridge Scheduler sends the Input directly as the event object
    // So we should access eventId, reminderType and occurrenceDate directly from the event
    eventId = event.eventId;
    reminderType = event.reminderType;
    occurrenceDate = event.occurrenceDate ? new Date(event.occurrenceDate) : null;
    
    // Fallback: try other possible formats for compatibility
    if (!eventId) {
      const payload = typeof event.detail === 'string'
        ? JSON.parse(event.detail)
        : event.detail || JSON.parse(event.body || '{}');
      
      eventId = payload.eventId;
      reminderType = payload.reminderType;
      occurrenceDate = payload.occurrenceDate ? new Date(payload.occurrenceDate) : null;
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
    
    // New efficient system: always send to all eligible attendees (no userId filtering in Lambda)
    // The efficiency comes from scheduling fewer Lambda invocations, not from filtering users
    await createEventReminderNotification(eventId, notificationReminderType);
    
    // If this was for a recurring event occurrence, schedule the next occurrence reminder
    if (occurrenceDate) {
      await scheduleNextOccurrenceReminder(eventId, occurrenceDate);
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