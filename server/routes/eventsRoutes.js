const express = require('express');
const { 
    getMyEvents, 
    getUserEvents, 
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

const router = express.Router();

router.post('/eventslist/create/new/event', authMiddleware, createEvent);
router.put('/eventslist/update/:eventId', authMiddleware, updateEvent);
router.post('/eventslist/respond/invitation', authMiddleware, respondToEventInvitation);
router.post('/eventslist/join', authMiddleware, joinEvent);
router.post('/eventslist/not-interested', authMiddleware, markEventNotInterested);
router.post('/eventslist/report', authMiddleware, reportEvent);
router.post('/eventslist/cancel/event', authMiddleware, cancelEvent);
router.post('/eventslist/:eventId/invite', authMiddleware, inviteEventAttendees);
router.delete('/eventslist/cleanup/recurring', authMiddleware, deleteRecurringEvents);
router.get('/eventslist/get/my/events', authMiddleware, getMyEvents);
router.get('/eventslist/get/my/events/month/view', authMiddleware, getMyEventsCalendarMonthView);
router.get('/eventslist/get/my/events/range', authMiddleware, getMyEventsForDateRange);
router.get('/eventslist/get/my/past/events', authMiddleware, getMyPastEvents);
router.get('/eventslist/get/my/upcoming/events', authMiddleware, getMyUpcomingEvents);
router.get('/eventslist/get/attention/required', authMiddleware, getAttentionRequiredEvents);
router.get('/eventslist/get/recommended', authMiddleware, getRecommendedEvents);
router.get('/eventslist/get/user/events', authMiddleware, getUserEvents);
router.get('/eventslist/event/get/event/by/id', authMiddleware, getEventById);
router.get('/eventslist/get/nearby/events', authMiddleware, getNearbyEvents);
router.get('/eventslist/category/:category', authMiddleware, getEventsByCategory);
router.get('/eventslist/city/:city', authMiddleware, getEventsByCity);
router.get('/eventslist/friends', authMiddleware, getFriendsEvents);
// router.get('/eventslist/get/event/categories', authMiddleware, getEventCategories);

// Add remove attendee route
router.post('/eventslist/remove-attendee', authMiddleware, removeEventAttendee);

module.exports = router;