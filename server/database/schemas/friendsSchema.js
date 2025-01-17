const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const friendsSchema = new mongoose.Schema({
  friendship_id: {
    type: String,
    default: uuidv4, // Generate UUID for friendship_id
    unique: true,
    required: true,
  },
  user_id_1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  user_id_2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'], // Allowed values
    default: 'Pending', // Default value
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  }
});

module.exports = mongoose.model('Friends', friendsSchema);
