const express = require('express');
const {
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount
} = require('../controllers/notificationsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// Get user notifications with pagination
router.get('/', authMiddleware, getUserNotifications);

// Mark notifications as seen
router.put('/mark-seen', authMiddleware, markNotificationsAsSeen);

// Get unseen notifications count
router.get('/unseen-count', authMiddleware, getUnseenNotificationsCount);

module.exports = router; 