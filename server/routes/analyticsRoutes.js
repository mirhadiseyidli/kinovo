const express = require('express');
const router = express.Router();
const {
  requireAdmin,
  getDashboard,
  backfillAnalytics,
  calculateRetention,
  getTodaysAnalytics,
  updateLocationStats
} = require('../controllers/analyticsController');

// GET /api/analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', requireAdmin, getDashboard);

// POST /api/analytics/backfill - Backfill analytics with current user count
router.post('/backfill', requireAdmin, backfillAnalytics);

// POST /api/analytics/retention - Manually trigger retention calculation
router.post('/retention', requireAdmin, calculateRetention);

// GET /api/analytics/today - Get today's analytics
router.get('/today', requireAdmin, getTodaysAnalytics);

// POST /api/analytics/location - Update user location stats (called internally)
router.post('/location', requireAdmin, updateLocationStats);

module.exports = router;