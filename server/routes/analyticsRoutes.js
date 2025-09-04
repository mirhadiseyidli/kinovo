const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { verifyAccessToken } = require('../utils/token');

// Middleware to verify admin access
const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    
    // Get user from database to check role
    const User = require('../database/schemas/usersSchema');
    const user = await User.findById(decoded.id).select('role');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.user = { ...decoded, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// GET /api/analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const dashboardData = await analyticsService.getDashboardData(days);
    
    if (!dashboardData) {
      return res.status(404).json({
        success: false,
        message: 'No analytics data found'
      });
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard'
    });
  }
});

// POST /api/analytics/retention - Manually trigger retention calculation
router.post('/retention', requireAdmin, async (req, res) => {
  try {
    await analyticsService.calculateRetentionCohorts();
    
    res.json({
      success: true,
      message: 'Retention cohorts calculated successfully'
    });
  } catch (error) {
    console.error('Error calculating retention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate retention cohorts'
    });
  }
});

// GET /api/analytics/today - Get today's analytics
router.get('/today', requireAdmin, async (req, res) => {
  try {
    const Analytics = require('../database/schemas/analyticsSchema');
    const today = new Date().toISOString().split('T')[0];
    const todaysData = await Analytics.findOne({ date: today });
    
    if (!todaysData) {
      return res.status(404).json({
        success: false,
        message: 'No analytics data for today'
      });
    }

    res.json({
      success: true,
      data: {
        ...todaysData.toObject(),
        dailyActiveUsersCount: todaysData.dailyActiveUsersCount,
        retentionRates: {
          day1: todaysData.getRetentionRate(1),
          day7: todaysData.getRetentionRate(7),
          day30: todaysData.getRetentionRate(30)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s analytics'
    });
  }
});

// POST /api/analytics/location - Update user location stats (called internally)
router.post('/location', requireAdmin, async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State is required'
      });
    }

    await analyticsService.updateLocationStats({ state });
    
    res.json({
      success: true,
      message: 'Location stats updated'
    });
  } catch (error) {
    console.error('Error updating location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location stats'
    });
  }
});

module.exports = router;