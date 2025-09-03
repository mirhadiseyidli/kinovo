const mongoose = require('mongoose');

const twoFactorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Create TTL index to automatically delete expired codes after 5 minutes
twoFactorSchema.index({ expires_at: 1 }, { expireAfterSeconds: 300 });

// Compound index for efficient lookups
twoFactorSchema.index({ user: 1, code: 1, expires_at: 1 });

module.exports = mongoose.model('TwoFactor', twoFactorSchema);