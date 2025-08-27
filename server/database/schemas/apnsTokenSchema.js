const mongoose = require('mongoose');

const apnsTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    index: true  // Changed from unique to regular index
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

// Compound unique index: each user-token pair must be unique
apnsTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
// Index for efficient queries
apnsTokenSchema.index({ userId: 1, isActive: 1 });
apnsTokenSchema.index({ token: 1, isActive: 1 });
apnsTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // Auto-delete after 90 days

// Update the updatedAt field on save
apnsTokenSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('token')) {
    this.lastUsed = new Date();
  }
  next();
});

// Static methods
apnsTokenSchema.statics.findActiveTokensByUserId = function(userId) {
  return this.find({ userId, isActive: true }).sort({ lastUsed: -1 });
};

apnsTokenSchema.statics.findActiveTokensByUserIds = function(userIds) {
  return this.find({ 
    userId: { $in: userIds }, 
    isActive: true 
  });
};

apnsTokenSchema.statics.deactivateToken = function(token) {
  // Deactivate ALL entries for this token (across all users)
  // This is called when APNs reports a token as invalid
  return this.updateMany({ token }, { isActive: false, updatedAt: new Date() });
};

apnsTokenSchema.statics.cleanupOldTokens = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    $or: [
      { isActive: false, updatedAt: { $lt: thirtyDaysAgo } },
      { lastUsed: { $lt: thirtyDaysAgo } }
    ]
  });
};

module.exports = mongoose.model('APNsToken', apnsTokenSchema);