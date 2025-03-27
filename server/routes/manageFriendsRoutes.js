const express = require('express');
const { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, getUserFriends, syncContacts, getReceivedFriendRequests } = require('../controllers/manageFriendsController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.post('/friendrequests/send', authMiddleware, sendFriendRequest);
router.get('/friendrequests/accept', authMiddleware, acceptFriendRequest);
router.get('/friendrequests/reject', authMiddleware, rejectFriendRequest);
router.get('/friendrequests/cancel', authMiddleware, cancelFriendRequest);
router.get('/user/get/friends', authMiddleware, getUserFriends);
router.post('/user/contacts/sync', authMiddleware, syncContacts);
router.get('/user/get/received/friend/requests', authMiddleware, getReceivedFriendRequests);

module.exports = router;
