const express = require('express');
const { getMyEvents, getUserEvents, createEvent, getMyPastEvents, getMyUpcomingEvents, getMyEventsCalendarMonthView, getEventById, getNearbyEvents } = require('../controllers/eventsController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

router.post('/eventslist/create/new/event', authMiddleware, createEvent);
router.get('/eventslist/get/my/events', authMiddleware, getMyEvents);
router.get('/eventslist/get/my/events/month/view', authMiddleware, getMyEventsCalendarMonthView);
router.get('/eventslist/get/my/past/events', authMiddleware, getMyPastEvents);
router.get('/eventslist/get/my/upcoming/events', authMiddleware, getMyUpcomingEvents);
router.get('/eventslist/get/user/events', authMiddleware, getUserEvents);
router.get('/eventslist/event/get/event/by/id', authMiddleware, getEventById);
router.get('/eventslist/get/nearby/events', authMiddleware, getNearbyEvents);
// router.get('/eventslist/get/event/categories', authMiddleware, getEventCategories);

module.exports = router;