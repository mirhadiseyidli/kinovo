const express = require('express');
const { getFriendSuggestions } = require('../controllers/userSuggestionsController')
const { authMiddleware } = require('../utils/authMiddleware');
const { friendsReadLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/user/friends/suggestions', authMiddleware, friendsReadLimiter, getFriendSuggestions);

module.exports = router;
