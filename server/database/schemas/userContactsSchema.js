const mongoose = require('mongoose');

const userContactsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  contactName: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
userContactsSchema.index({ user: 1, phoneNumber: 1 }, { unique: true });
userContactsSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('UserContacts', userContactsSchema); 