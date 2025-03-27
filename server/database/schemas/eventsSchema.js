const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventsSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  status: {
    type: String,
    enum: ['Active', 'Closed', 'Cancelled'], // Allowed values
    default: 'Invited', // Default value
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  },
  title: {
    type: String, // Title of the event
    required: true, // Mandatory field
  },
  description: {
    type: String, // Text description of the event
    default: null, // Optional
  },
  // TODO: Location needs to be an address that can
  // be picked from suggestions like in Google Maps
  location: {
    type: String, // Text address for location 
    default: null, // Optional
  },
  start_time: {
    type: Date, // Start time of the event
    required: true, // Mandatory field
  },
  end_time: {
    type: Date, // End time of the event
    required: true, // Mandatory field
  },
  max_participants: {
    type: Number, // Maximum number of participants
    default: null, // Optional field
  },
});

module.exports = mongoose.model('Events', eventsSchema);
