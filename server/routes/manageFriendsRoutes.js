const express = require('express');
const { 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  cancelFriendRequestSender, 
  cancelFriendRequestReceiver, 
  getUserFriends, 
  syncContacts, 
  getReceivedFriendRequests,
  removeFriendFromFriendsList,
  getUserToViewFriends,
  getNumberOfFriendsNewEvents,
  checkFriendshipStatus,
  inviteFriendByEmail
} = require('../controllers/manageFriendsController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');
const { friendsReadLimiter, friendsWriteLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/friendrequests/send', authMiddleware, friendsWriteLimiter, sendFriendRequest);
router.post('/friendrequests/accept', authMiddleware, friendsWriteLimiter, acceptFriendRequest);
router.post('/friendrequests/reject', authMiddleware, friendsWriteLimiter, rejectFriendRequest);
router.post('/friendrequests/sender/cancel', authMiddleware, friendsWriteLimiter, cancelFriendRequestSender);
router.post('/friendrequests/receiver/cancel', authMiddleware, friendsWriteLimiter, cancelFriendRequestReceiver);
router.post('/friends/remove/friend/from/friendslist', authMiddleware, friendsWriteLimiter, removeFriendFromFriendsList);
router.get('/user/get/friends', authMiddleware, friendsReadLimiter, getUserFriends);
router.get('/user/get/user/to/view/friends', authMiddleware, friendsReadLimiter, getUserToViewFriends);
router.post('/user/contacts/sync', authMiddleware, friendsWriteLimiter, syncContacts);
router.get('/user/get/received/friend/requests', authMiddleware, friendsReadLimiter, getReceivedFriendRequests);
router.get('/user/get/number/friends/new/events', authMiddleware, friendsReadLimiter, getNumberOfFriendsNewEvents);
router.post('/check/friendship/status', authMiddleware, friendsReadLimiter, checkFriendshipStatus);
router.post('/invite-by-email', authMiddleware, friendsWriteLimiter, inviteFriendByEmail);

module.exports = router;
