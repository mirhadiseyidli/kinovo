const mongoose = require('mongoose');

const notificationsSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
    default: null,
  },
  friend_request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FriendRequests',
    default: null,
  },
  type: {
    type: String,
    enum: [
      'friend_request',
      'friend_request_accepted',
      'event_reminder',
      'event_updated',
      'new_event_nearby',
      'event_attendance_confirmed',
      'new_event_from_friend',
      'event_invitation',
      'someone_from_contacts_joined'
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: null,
  },
  message_body: {
    type: String,
    default: null,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'maybe', 'rejected', 'seen', 'unseen'],
    default: 'pending',
  },
  is_seen: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  }
});

// Update the updated_at field before saving
notificationsSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Index for efficient queries
notificationsSchema.index({ recipient: 1, created_at: -1 });
notificationsSchema.index({ recipient: 1, is_seen: 1 });

module.exports = mongoose.model('Notifications', notificationsSchema);
