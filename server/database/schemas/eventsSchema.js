const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventsSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', // Refers to Users Schema
    default: null,
  },
  event_picture: {
    type: String,
    required: false,
    default: null
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming',
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
  category: {
    type: String,
    required: true,
    validate: {
      validator: async function(value) {
        const Category = mongoose.model('Category');
        const category = await Category.findOne({ name: value, active: true });
        return category !== null;
      },
      message: props => `${props.value} is not a valid category`
    }
  },
  description: {
    type: String, // Text description of the event
    default: null, // Optional
  },
  // TODO: Location needs to be an address that can
  // be picked from suggestions like in Google Maps
  location: {
    text: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null }
    }
  },
  start_time: {
    type: Date, // Start time of the event
    required: true, // Mandatory field
  },
  end_time: {
    type: Date, // End time of the event
    required: true, // Mandatory field
  },
  capacity: {
    type: Number, // Maximum number of participants
    default: null, // Optional field
  },
  recurrence: {
    checked: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', null],
      default: null,
    },
    end_date: {
      type: Date,
      default: null, // When the recurrence should stop
    }
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'maybe', 'accepted', 'rejected'],
      default: 'pending',
    }
  }],
  visibility: {
    type: String,
    enum: ['public', 'private', 'selected'],
    default: 'private',
  },
  excludedDates: [{
    type: Date,
    default: []
  }], // Dates to exclude from recurring event generation
});

module.exports = mongoose.model('Events', eventsSchema);
