const express = require('express');
const { searchAll } = require('../controllers/searchController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, checkRole(["admin", "member"]), searchAll);

module.exports = router;