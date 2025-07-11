const mongoose = require('mongoose');

const userNotificationPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true
  },
  preferences: {
    inApp: {
      friend_request_accepted: { type: Boolean, default: true },
      event_reminder: { type: Boolean, default: true },
      event_updated: { type: Boolean, default: true },
      new_event_nearby: { type: Boolean, default: true },
      event_attendance_confirmed: { type: Boolean, default: true },
      new_event_from_friend: { type: Boolean, default: true },
      event_invitation: { type: Boolean, default: true },
      someone_from_contacts_joined: { type: Boolean, default: true }
    },
    email: {
      friend_request_accepted: { type: Boolean, default: false },
      event_reminder: { type: Boolean, default: true },
      event_updated: { type: Boolean, default: false },
      new_event_nearby: { type: Boolean, default: false },
      event_attendance_confirmed: { type: Boolean, default: false },
      new_event_from_friend: { type: Boolean, default: false },
      event_invitation: { type: Boolean, default: false },
      someone_from_contacts_joined: { type: Boolean, default: false }
    },
    push: {
      friend_request_accepted: { type: Boolean, default: true },
      event_reminder: { type: Boolean, default: true },
      event_updated: { type: Boolean, default: true },
      new_event_nearby: { type: Boolean, default: true },
      event_attendance_confirmed: { type: Boolean, default: true },
      new_event_from_friend: { type: Boolean, default: true },
      event_invitation: { type: Boolean, default: true },
      someone_from_contacts_joined: { type: Boolean, default: true }
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field before saving
userNotificationPreferencesSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('UserNotificationPreferences', userNotificationPreferencesSchema); 