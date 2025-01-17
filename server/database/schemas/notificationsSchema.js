const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationsSchema = new mongoose.Schema({
  notification_id: {
    type: String,
    default: uuidv4, // Generate UUID for notification_id
    unique: true,
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events', // Refers to Events Schema
    default: null,
  },
  type: {
    type: String,
    enum: ['Reminder', 'Update', 'Cancel'], // Allowed values for type
    required: true,
  },
  message_body: {
    type: String,
    default: null, // Allow it to be nullable
  },
  sent_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  }
});

module.exports = mongoose.model('Notifications', notificationsSchema);
