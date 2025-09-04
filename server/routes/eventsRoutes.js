const express = require('express');
const { 
    getMyEvents, 
    getUserEvents, 
    getUserEventsCount,
    createEvent, 
    getMyPastEvents, 
    getMyUpcomingEvents, 
    getMyEventsCalendarMonthView, 
    getMyEventsForDateRange, 
    getEventById, 
    getNearbyEvents, 
    respondToEventInvitation, 
    cancelEvent, 
    deleteRecurringEvents, 
    inviteEventAttendees, 
    getEventsByCategory, 
    getEventsByCity, 
    getAttentionRequiredEvents, 
    getRecommendedEvents, 
    getFriendsEvents, 
    joinEvent, 
    markEventNotInterested, 
    reportEvent, 
    updateEvent, 
    removeEventAttendee,
} = require('../controllers/eventsController');
const { authMiddleware } = require('../utils/authMiddleware');
const { eventWriteLimiter, eventReadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/eventslist/create/new/event', authMiddleware, eventWriteLimiter, createEvent);
router.put('/eventslist/update/:eventId', authMiddleware, eventWriteLimiter, updateEvent);
router.post('/eventslist/respond/invitation', authMiddleware, eventWriteLimiter, respondToEventInvitation);
router.post('/eventslist/join', authMiddleware, eventWriteLimiter, joinEvent);
router.post('/eventslist/not-interested', authMiddleware, eventWriteLimiter, markEventNotInterested);
router.post('/eventslist/report', authMiddleware, eventWriteLimiter, reportEvent);
router.post('/eventslist/cancel/event', authMiddleware, eventWriteLimiter, cancelEvent);
router.post('/eventslist/:eventId/invite', authMiddleware, eventWriteLimiter, inviteEventAttendees);
router.delete('/eventslist/cleanup/recurring', authMiddleware, eventWriteLimiter, deleteRecurringEvents);
router.get('/eventslist/get/my/events', authMiddleware, eventReadLimiter, getMyEvents);
router.get('/eventslist/get/my/events/month/view', authMiddleware, eventReadLimiter, getMyEventsCalendarMonthView);
router.get('/eventslist/get/my/events/range', authMiddleware, eventReadLimiter, getMyEventsForDateRange);
router.get('/eventslist/get/my/past/events', authMiddleware, eventReadLimiter, getMyPastEvents);
router.get('/eventslist/get/my/upcoming/events', authMiddleware, eventReadLimiter, getMyUpcomingEvents);
router.get('/eventslist/get/attention/required', authMiddleware, eventReadLimiter, getAttentionRequiredEvents);
router.get('/eventslist/get/recommended', authMiddleware, eventReadLimiter, getRecommendedEvents);
router.get('/eventslist/get/user/events', authMiddleware, eventReadLimiter, getUserEvents);
router.get('/eventslist/get/user/events/count', authMiddleware, eventReadLimiter, getUserEventsCount);
router.get('/eventslist/event/get/event/by/id', authMiddleware, eventReadLimiter, getEventById);
router.get('/eventslist/get/nearby/events', authMiddleware, eventReadLimiter, getNearbyEvents);
router.get('/eventslist/category/:category', authMiddleware, eventReadLimiter, getEventsByCategory);
router.get('/eventslist/city/:city', authMiddleware, eventReadLimiter, getEventsByCity);
router.get('/eventslist/friends', authMiddleware, eventReadLimiter, getFriendsEvents);
// router.get('/eventslist/get/event/categories', authMiddleware, getEventCategories);

// Add remove attendee route
router.post('/eventslist/remove-attendee', authMiddleware, eventWriteLimiter, removeEventAttendee);

module.exports = router;