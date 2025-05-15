const express = require('express');
const { searchPeople, searchRelevantEvents } = require('../controllers/searchController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/users', authMiddleware, searchPeople);
router.get('/discover/search/everything', authMiddleware, searchRelevantEvents);

module.exports = router;