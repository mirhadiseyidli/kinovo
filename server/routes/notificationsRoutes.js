const express = require('express');
const {
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  saveFCMToken,
  sendTestNotification
} = require('../controllers/notificationsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// Get user notifications with pagination
router.get('/', authMiddleware, getUserNotifications);

// Mark notifications as seen
router.put('/mark-seen', authMiddleware, markNotificationsAsSeen);

// Get unseen notifications count
router.get('/unseen-count', authMiddleware, getUnseenNotificationsCount);

// Get user notification preferences
router.get('/preferences', authMiddleware, getUserNotificationPreferences);

// Update user notification preferences
router.put('/preferences', authMiddleware, updateUserNotificationPreferences);

// FCM token management
router.post('/fcm-token', saveFCMToken);

// Test notification route
router.post('/test', authMiddleware, sendTestNotification);

module.exports = router; 