const express = require('express');
const { getMyEvents, getUserEvents, createEvent, getMyPastEvents } = require('../controllers/eventsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

router.post('/eventslist/create/new/event', authMiddleware, createEvent);
router.get('/eventslist/get/my/events', authMiddleware, getMyEvents);
router.get('/eventslist/get/my/past/events', authMiddleware, getMyPastEvents);
router.get('/eventslist/get/user/events', authMiddleware, getUserEvents);

module.exports = router;