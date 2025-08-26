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
        // Try exact match first, then case-insensitive match
        let category = await Category.findOne({ name: value, active: true });
        if (!category) {
          category = await Category.findOne({ 
            name: { $regex: new RegExp(`^${value}$`, 'i') }, 
            active: true 
          });
          // If found with case-insensitive match, update the value to the correct case
          if (category) {
            this.category = category.name;
          }
        }
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
    },
    mapSnapshotUrl: { 
      light: { type: String, default: null }, 
      dark: { type: String, default: null } 
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
  // iOS Calendar Sync Fields
  iosCalendarEventId: {
    type: String,
    default: null, // iOS Calendar event ID for synced events
  },
  calendarSyncEnabled: {
    type: Boolean,
    default: false, // Whether this event should sync to iOS Calendar
  },
  lastSyncedAt: {
    type: Date,
    default: null, // When this event was last synced to calendar
  }
});

module.exports = mongoose.model('Events', eventsSchema);
