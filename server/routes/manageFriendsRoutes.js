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
  getNumberOfFriendsNewEvents
} = require('../controllers/manageFriendsController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.post('/friendrequests/send', authMiddleware, sendFriendRequest);
router.post('/friendrequests/accept', authMiddleware, acceptFriendRequest);
router.post('/friendrequests/reject', authMiddleware, rejectFriendRequest);
router.post('/friendrequests/sender/cancel', authMiddleware, cancelFriendRequestSender);
router.post('/friendrequests/receiver/cancel', authMiddleware, cancelFriendRequestReceiver);
router.post('/friends/remove/friend/from/friendslist', authMiddleware, removeFriendFromFriendsList);
router.get('/user/get/friends', authMiddleware, getUserFriends);
router.get('/user/get/user/to/view/friends', authMiddleware, getUserToViewFriends);
router.post('/user/contacts/sync', authMiddleware, syncContacts);
router.get('/user/get/received/friend/requests', authMiddleware, getReceivedFriendRequests);
router.get('/user/get/number/friends/new/events', authMiddleware, getNumberOfFriendsNewEvents);

module.exports = router;
