const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
fcmTokenSchema.index({ userId: 1, isActive: 1 });
// Note: token field already has an index due to unique: true, so no need to add another one
fcmTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // Auto-delete after 90 days

// Update the updatedAt field on save
fcmTokenSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('token')) {
    this.lastUsed = new Date();
  }
  next();
});

// Static methods
fcmTokenSchema.statics.findActiveTokensByUserId = function(userId) {
  return this.find({ userId, isActive: true }).sort({ lastUsed: -1 });
};

fcmTokenSchema.statics.findActiveTokensByUserIds = function(userIds) {
  return this.find({ 
    userId: { $in: userIds }, 
    isActive: true 
  });
};

fcmTokenSchema.statics.deactivateToken = function(token) {
  return this.updateOne({ token }, { isActive: false, updatedAt: new Date() });
};

fcmTokenSchema.statics.cleanupOldTokens = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    $or: [
      { isActive: false, updatedAt: { $lt: thirtyDaysAgo } },
      { lastUsed: { $lt: thirtyDaysAgo } }
    ]
  });
};

module.exports = mongoose.model('FCMToken', fcmTokenSchema); 