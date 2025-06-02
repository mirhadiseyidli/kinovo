const mongoose = require('mongoose');

const eventOccurrenceSchema = new mongoose.Schema({
  master_event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events', // Reference the master event collection
    required: true,
  },
  // The specific date of this occurrence (generated based on the master recurrence rule)
  occurrence_date: { 
    type: Date, 
    required: true 
  },
  // User who made this occurrence-specific modification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  // Optional overrides for this occurrence (if any field should differ from the master event)
  override: {
    title: { type: String },
    description: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    // User-specific attendance status for this occurrence
    attendanceStatus: {
      type: String,
      enum: ['pending', 'maybe', 'accepted', 'rejected'],
    },
    // You can add other fields as needed
  },
  // A flag to mark the occurrence as cancelled
  cancelled: { 
    type: Boolean, 
    default: false 
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  }
});

// Compound index to ensure one occurrence per user per date per event
eventOccurrenceSchema.index({ master_event: 1, occurrence_date: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('EventOccurrence', eventOccurrenceSchema);