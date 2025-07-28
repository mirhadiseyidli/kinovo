const mongoose = require('mongoose');

const userPresenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  online: {
    type: Boolean,
    default: false,
    index: true
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
userPresenceSchema.index({ online: 1, lastActive: -1 });

// Update the updatedAt field on save
userPresenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
userPresenceSchema.statics.setUserOnline = function(userId) {
  return this.findOneAndUpdate(
    { userId },
    { 
      online: true, 
      lastActive: new Date(),
      updatedAt: new Date()
    },
    { 
      upsert: true, 
      new: true 
    }
  );
};

userPresenceSchema.statics.setUserOffline = function(userId) {
  return this.findOneAndUpdate(
    { userId },
    { 
      online: false, 
      lastActive: new Date(),
      updatedAt: new Date()
    },
    { 
      upsert: true, 
      new: true 
    }
  );
};

userPresenceSchema.statics.getOnlineUsers = function() {
  return this.find({ online: true })
    .populate('userId', 'full_name username profile_picture')
    .sort({ lastActive: -1 });
};

userPresenceSchema.statics.getUserPresence = function(userId) {
  return this.findOne({ userId })
    .populate('userId', 'full_name username profile_picture');
};

userPresenceSchema.statics.getFriendsPresence = function(userIds) {
  return this.find({ userId: { $in: userIds } })
    .populate('userId', 'full_name username profile_picture')
    .sort({ lastActive: -1 });
};

// Clean up old offline statuses (older than 7 days)
userPresenceSchema.statics.cleanupOldStatuses = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    online: false, 
    lastActive: { $lt: sevenDaysAgo } 
  });
};

module.exports = mongoose.model('UserPresence', userPresenceSchema);