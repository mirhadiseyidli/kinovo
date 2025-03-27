const express = require('express');
const { searchPeople } = require('../controllers/searchController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/users', authMiddleware, searchPeople);

module.exports = router;