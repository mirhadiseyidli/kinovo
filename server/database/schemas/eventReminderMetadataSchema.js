const mongoose = require('mongoose');

const eventReminderMetadataSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
    required: true,
    index: true
  },
  
  // For recurring events, track the next occurrences that have reminders scheduled
  scheduled_occurrences: [{
    occurrence_date: { type: Date, required: true },
    reminder_10min_scheduled: { type: Boolean, default: false },
    reminder_1hour_scheduled: { type: Boolean, default: false },
    reminder_10min_schedule_name: { type: String, default: null },
    reminder_1hour_schedule_name: { type: String, default: null }
  }],
  
  // Track the last processed occurrence for recurring events
  last_processed_occurrence: { type: Date, default: null },
  
  // For one-time events
  reminder_10min_scheduled: { type: Boolean, default: false },
  reminder_1hour_scheduled: { type: Boolean, default: false },
  reminder_10min_schedule_name: { type: String, default: null },
  reminder_1hour_schedule_name: { type: String, default: null },
  
  // Event type for quick filtering
  is_recurring: { type: Boolean, required: true },
  
  // Recurring event details (cached from main event for efficiency)
  recurrence_frequency: { 
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null
  },
  recurrence_end_date: { type: Date, default: null },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Compound index for efficient queries
eventReminderMetadataSchema.index({ event_id: 1, is_recurring: 1 });
eventReminderMetadataSchema.index({ 'scheduled_occurrences.occurrence_date': 1 });

// Update the updated_at field on save
eventReminderMetadataSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('EventReminderMetadata', eventReminderMetadataSchema);