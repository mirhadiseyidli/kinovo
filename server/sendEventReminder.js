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
  console.log('NAT IP:', res.data.trim());
  console.log('SendEventReminder Lambda received event:', JSON.stringify(event, null, 2));
  
  let eventId;

  try {
    // EventBridge Scheduler sends the Input directly as the event object
    // So we should access eventId directly from the event
    eventId = event.eventId;
    
    // Fallback: try other possible formats for compatibility
    if (!eventId) {
      const payload = typeof event.detail === 'string'
        ? JSON.parse(event.detail)
        : event.detail || JSON.parse(event.body || '{}');
      
      eventId = payload.eventId;
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
    console.log('Connecting to MongoDB...');
    await connectToDatabase();
    console.log('MongoDB connection established');

    console.log('SendEventReminder Lambda creating reminder notification for event:', eventId);
    await createEventReminderNotification(eventId);
    
    console.log('Event reminder notification created successfully');
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