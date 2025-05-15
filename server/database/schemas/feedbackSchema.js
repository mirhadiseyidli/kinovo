const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const feedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',  // Refers to Events Schema
    default: null,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comments: {
    type: String,
    default: null, // Allow it to be nullable
  },
  submitted_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
