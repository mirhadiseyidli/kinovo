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
  // Optional overrides for this occurrence (if any field should differ from the master event)
  override: {
    title: { type: String },
    description: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
    // You can add other fields as needed
  },
  // A flag to mark the occurrence as cancelled
  cancelled: { 
    type: Boolean, 
    default: false 
  }
});

module.exports = mongoose.model('EventOccurrence', eventOccurrenceSchema);