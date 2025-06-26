const express = require('express');
const router = express.Router();
const { handleEventShare, handleProfileShare } = require('../controllers/shareController');

// Share routes
router.get('/event/:event_id', handleEventShare);
router.get('/profile/:user_id', handleProfileShare);

module.exports = router; 