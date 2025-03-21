const mongoose = require('mongoose');
const validator = require('validator');
const { CountryCodes } = require('validator/lib/isISO31661Alpha2');

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
});

module.exports = mongoose.model('Users', usersSchema);
