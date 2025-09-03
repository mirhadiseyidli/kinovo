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

// Each token can only exist once in the database (device uniqueness)
apnsTokenSchema.index({ token: 1 }, { unique: true });
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
  // Deactivate the token (only one entry should exist per token now)
  // This is called when APNs reports a token as invalid
  return this.updateOne({ token }, { isActive: false, updatedAt: new Date() });
};

apnsTokenSchema.statics.deactivateUserTokens = function(userId) {
  // Deactivate all tokens for a specific user (called on logout)
  return this.updateMany({ userId, isActive: true }, { isActive: false, updatedAt: new Date() });
};

apnsTokenSchema.statics.upsertToken = async function(token, userId) {
  // Find existing token entry
  const existingToken = await this.findOne({ token });
  
  if (existingToken) {
    // Token exists - update userId and reactivate
    existingToken.userId = userId;
    existingToken.isActive = true;
    existingToken.lastUsed = new Date();
    existingToken.updatedAt = new Date();
    return await existingToken.save();
  } else {
    // New token - create entry
    return await this.create({
      token,
      userId,
      isActive: true,
      lastUsed: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
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