const express = require('express');
const {
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  saveAPNsToken,
  sendTestNotification
} = require('../controllers/notificationsController');
const { authMiddleware } = require('../utils/authMiddleware');
const { notificationReadLimiter, notificationWriteLimiter, pushNotificationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get user notifications with pagination
router.get('/', authMiddleware, notificationReadLimiter, getUserNotifications);

// Mark notifications as seen
router.put('/mark-seen', authMiddleware, notificationWriteLimiter, markNotificationsAsSeen);

// Get unseen notifications count
router.get('/unseen-count', authMiddleware, notificationReadLimiter, getUnseenNotificationsCount);

// Get user notification preferences
router.get('/preferences', authMiddleware, notificationReadLimiter, getUserNotificationPreferences);

// Update user notification preferences
router.put('/preferences', authMiddleware, notificationWriteLimiter, updateUserNotificationPreferences);

// APNs token management
router.post('/apns-token', notificationWriteLimiter, saveAPNsToken);

// Test notification route
router.post('/test', authMiddleware, pushNotificationLimiter, sendTestNotification);

module.exports = router; 