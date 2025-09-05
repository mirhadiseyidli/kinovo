const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },

  // ── User Activity Sessions ──────────────────────────────
  sessions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // in milliseconds
      default: 0
    }
  }],

  // ── New User Registrations ──────────────────────────────
  newUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],

  // ── Metadata ─────────────────────────────
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: false,
  collection: 'analytics'
});

// Indexes for faster queries
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ 'sessions.userId': 1 });
analyticsSchema.index({ 'sessions.startTime': 1 });
analyticsSchema.index({ 'newUserIds': 1 });

// Static method to find analytics for a date range
analyticsSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

// Static method to get or create today's analytics
analyticsSchema.statics.getOrCreateToday = async function() {
  const today = new Date().toISOString().split('T')[0];
  
  let analytics = await this.findOne({ date: today });
  if (!analytics) {
    analytics = await this.create({ date: today });
  }
  
  return analytics;
};

module.exports = mongoose.model('Analytics', analyticsSchema);