const mongoose = require('mongoose');
const validator = require('validator');

const usersSchema = new mongoose.Schema({
  uuid: {
    type: String,
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
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
  }],
  friend_requests: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    created_at: {
      type: Date,
      default: Date.now(),
    }
  }]
});

module.exports = mongoose.model('Users', usersSchema);
