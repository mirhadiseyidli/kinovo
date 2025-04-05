const mongoose = require('mongoose');
const validator = require('validator');

const usersSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  full_name: {
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
  email_verified: {
    type: Boolean,
    default: false,
    required: true,
  },
  phone_number: {
    country_code: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id; // Required only for non-Google users
      }
    },
    area_code: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id; // Required only for non-Google users
      }
    },
    phone_num: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id; // Required only for non-Google users
      }
    },
    full_num: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id; // Required only for non-Google users
      }
    }
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
  cover_photo: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    default: null,
    maxlength: 300
  },
  date_of_birth: {
    type: Date,
    required: false,
  },
  created_at: {
    type: Date,
    default: Date.now(),  // Date & Time at the time of request
    required: true,
  },
  last_login_at: {
    type: Date,
    default: Date.now(),
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    validate: {
      validator: function(value) {
        return !this._id.equals(value);
      },
      message: 'User cannot add themselves as a friend',
    }
  }],
  location: {
    city: { type: String, default: null },
    state: { type: String, default: null },
    text: { type: String, default: null },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    }
  },
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
  }],
  past_events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
  }],
  favorite_activities: [{
    type: String,
    default: []
  }],
  social_handles: {
    _id: false,
    instagram: {
      username: {
        type: String,
        default: null
      }
    },
    facebook: {
      username: {
        type: String,
        default: null
      }
    },
  },
  last_checked_events: [
    {
      friend: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
      viewed_at: { type: Date, default: null }
    }
  ],
  friend_event_history: [
    {
      friend: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
      event: { type: mongoose.Schema.Types.ObjectId, ref: 'Events' },
      added_at: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('Users', usersSchema);
