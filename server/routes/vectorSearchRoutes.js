const express = require('express');
const { getVectorSearchHealth, triggerDataIndexing, getIndexingStatus } = require('../controllers/vectorSearchController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

// Public endpoint for health check
router.get('/health', getVectorSearchHealth);

// Admin-only endpoints
router.post('/index', authMiddleware, triggerDataIndexing);
router.get('/status', authMiddleware, getIndexingStatus);

module.exports = router;