const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true
  },

  // ── Totals ──────────────────────────────
  totalUsers: {
    type: Number,
    required: true,
    default: 0
  },
  newUserCount: {
    type: Number,
    required: true,
    default: 0
  },
  dailyActiveUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],

  // ── Sessions ────────────────────────────
  sessionCount: {
    type: Number,
    required: true,
    default: 0
  },
  avgSessionDuration: {
    type: Number,
    required: true,
    default: 0
  },

  // ── Retention Cohorts ───────────────────
  cohortDay0Ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],
  cohortDay1Ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],
  cohortDay7Ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],
  cohortDay30Ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users'
  }],

  // ── Location ─────────────────────────────
  topStates: {
    type: Map,
    of: Number,
    default: new Map()
  },

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

// Virtual for daily active users count
analyticsSchema.virtual('dailyActiveUsersCount').get(function() {
  return this.dailyActiveUserIds ? this.dailyActiveUserIds.length : 0;
});

// Method to get retention rate for a cohort
analyticsSchema.methods.getRetentionRate = function(cohortDay) {
  const cohortField = `cohortDay${cohortDay}Ids`;
  const cohortSize = this[cohortField] ? this[cohortField].length : 0;
  const baseSize = this.cohortDay0Ids ? this.cohortDay0Ids.length : 0;
  
  if (baseSize === 0) return 0;
  return ((cohortSize / baseSize) * 100).toFixed(2);
};

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