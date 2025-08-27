const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const {
    registerDeviceToken,
    invalidateDeviceToken,
    fetchNotifications,
    fetchFriendRequests,
    // fetchPresence, // DISABLED: Friend presence tracking
    updatePresenceHeartbeat,
    setUserOffline,
    fetchData
} = require('../controllers/pushFetchController');

const router = express.Router();

// Register/update APNs device token
router.post('/token', authMiddleware, registerDeviceToken);

// Invalidate device token on logout
router.delete('/token', authMiddleware, invalidateDeviceToken);

// Fetch endpoints (triggered by push notifications)
router.get('/notifications', authMiddleware, fetchNotifications);
router.get('/friend-requests', authMiddleware, fetchFriendRequests);
// DISABLED: Friend presence tracking not needed currently
// router.get('/presence', authMiddleware, fetchPresence);

// Presence management
router.post('/presence/heartbeat', authMiddleware, updatePresenceHeartbeat);
router.post('/presence/offline', authMiddleware, setUserOffline);

// Generic data fetch endpoint
router.get('/data', authMiddleware, fetchData);

module.exports = router;