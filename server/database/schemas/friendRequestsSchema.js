const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const friendRequests = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  status: {
    type: String,
    enum: ['pending'],
    default: 'pending',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now(),
    required: true
  },
});

friendRequests.pre('save', function (next) {
  if (this.sender.equals(this.receiver)) {
    return next(new Error('Sender and receiver cannot be the same user.'));
  }
  next();
});

module.exports = mongoose.model('FriendRequests', friendRequests);
