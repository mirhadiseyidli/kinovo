const express = require('express');
const { getAISummary } = require('../controllers/aiController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/stream/ai/summary', authMiddleware, getAISummary);

module.exports = router;
