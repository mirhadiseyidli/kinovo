const express = require('express');
const { getFriendSuggestions } = require('../controllers/userSuggestionsController')
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/user/friends/suggestions', authMiddleware, getFriendSuggestions);

module.exports = router;
