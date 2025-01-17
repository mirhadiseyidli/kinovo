const mongoose = require('mongoose');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');

const usersSchema = new mongoose.Schema({
  user_id: {
    type: String,
    default: uuidv4, // Generate UUID for user_id
    unique: true,
    required: true,
  },
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: {
      validator: function(value) {
        return validator.isEmail(value);
      },
      message: "Please provide a valid email address",
    },
  },
  // TODO: Password hashes before going into Database?
  password: {
    type: String,
    required: function () {
      return !this.google_id; // Required only for non-Google users
    }
  },
  google_id: {
    type: String,
    required: false,
  },
  // Google stores URLs as strings here. How does users
  // upload one by themselves?
  profile_picture: {
    type: String,
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  },
  last_login_at: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('Users', usersSchema);
