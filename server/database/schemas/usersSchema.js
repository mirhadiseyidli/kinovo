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
        return !this.google_id && !this.apple_id; // Required only for non-Google users
      }
    },
    area_code: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id && !this.apple_id; // Required only for non-Google users
      }
    },
    phone_num: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id && !this.apple_id; // Required only for non-Google users
      }
    },
    full_num: {
      type: String,
      default: null,
      required: function () {
        return !this.google_id && !this.apple_id; // Required only for non-Google users
      }
    }
  },
  // TODO: Password hashes before going into Database?
  password: {
    type: String,
    required: function () {
      return !this.google_id && !this.apple_id; // Required only for non-Google users
    }
  },
  google_id: {
    type: String,
    required: false,
  },
  apple_id: {
    type: String,
    required: false,
  },
  firebase_uid: {
    type: String,
    required: false,
    unique: true,
    sparse: true, // Allows multiple null values
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
  delete_requested: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    default: null,
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
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Events',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'maybe', 'accepted', 'rejected'],
      default: 'pending',
    }
  }],
  favorite_activities: [{
    type: String,
    enum: [
      'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Canoeing', 'Crossfit',
      'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
      'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate',
      'Inline Skate', 'Kayaking', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
      'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing',
      'Roller Ski', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard',
      'Snowshoe', 'Soccer', 'Squash', 'Stair Stepper', 'Stand Up Paddling',
      'Surfing', 'Swim', 'Table Tennis', 'Tennis', 'Trail Run', 'Velomobile',
      'Walk', 'Weight Training', 'Wheelchair', 'Windsurf', 'Workout', 'Yoga'
    ],
    validate: {
      validator: async function(value) {
        const Category = mongoose.model('Category');
        const category = await Category.findOne({ name: value, active: true });
        return category !== null;
      },
      message: props => `${props.value} is not a valid activity`
    }
  }],
  tags: [{
    activity_name: {
      type: String,
      enum: [
        'Alpine Ski', 'Backcountry Ski', 'Badminton', 'Canoeing', 'Crossfit',
        'E-Bike Ride', 'Elliptical', 'E-Mountain Bike Ride', 'Golf', 'Gravel Ride',
        'Handcycle', 'High Intensity Interval Training', 'Hike', 'Ice Skate',
        'Inline Skate', 'Kayaking', 'Kitesurf', 'Mountain Bike Ride', 'Nordic Ski',
        'Pickleball', 'Pilates', 'Racquetball', 'Ride', 'Rock Climbing',
        'Roller Ski', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard',
        'Snowshoe', 'Soccer', 'Squash', 'Stair Stepper', 'Stand Up Paddling',
        'Surfing', 'Swim', 'Table Tennis', 'Tennis', 'Trail Run', 'Velomobile',
        'Walk', 'Weight Training', 'Wheelchair', 'Windsurf', 'Workout', 'Yoga'
      ],
      required: true,
      validate: {
        validator: async function(value) {
          const Category = mongoose.model('Category');
          const category = await Category.findOne({ name: value, active: true });
          return category !== null;
        },
        message: props => `${props.value} is not a valid activity`
      }
    },
    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      validate: {
        validator: function(value) {
          return !this._id.equals(value);
        },
        message: 'User cannot tag themselves'
      }
    }]
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
      viewed_events: [
        {
          event: { type: mongoose.Schema.Types.ObjectId, ref: 'Events' },
          viewed_at: { type: Date, default: Date.now }
        }
      ]
    }
  ],
  friend_event_history: [
    {
      friend: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
      events: [
        {
          event: { type: mongoose.Schema.Types.ObjectId, ref: 'Events' },
          added_at: { type: Date, default: Date.now }
        }
      ]
    }
  ],
  blocked_users: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
      validate: {
        validator: function(value) {
          return !this._id.equals(value);
        },
        message: 'User cannot block themselves',
      }
    },
    blocked_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    reason: {
      type: String,
      default: null
    }
  }],
  not_interested_events: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Events',
      required: true
    },
    added_at: {
      type: Date,
      default: Date.now,
      required: true
    }
  }],
  event_reports: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Events',
      required: true
    },
    event_creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'abuse', 'false_information', 'other'],
      default: 'other'
    },
    details: {
      type: String,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'rejected'],
      default: 'pending'
    }
  }],
  event_reports_against_me: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Events',
      required: true
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'abuse', 'false_information', 'other'],
      default: 'other'
    },
    details: {
      type: String,
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'rejected'],
      default: 'pending'
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    }
  }],
  ai_assistant_id: {
    type: String,
    required: false,
  },
  reset_password_code: {
    type: String,
    required: false,
  },
  reset_password_expires: {
    type: Date,
    required: false,
  }
});

module.exports = mongoose.model('Users', usersSchema);
