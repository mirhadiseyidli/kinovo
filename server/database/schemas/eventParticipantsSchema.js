const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventParticipantsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events', // Refers to Events Schema
    default: null,
  },
  status: {
    type: String,
    enum: ['Invited', 'Accepted', 'Rejected'], // Allowed values
    default: 'Invited', // Default value
    required: true
  },
  joined_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  }
});

module.exports = mongoose.model('EventParticipants', eventParticipantsSchema);
