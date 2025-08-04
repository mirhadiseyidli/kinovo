const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const { 
  generateMapSnapshot, 
  generateMapSnapshotUrl,
  generateMapSnapshotUrls,
  generateMapSnapshotAndUpload 
} = require('../controllers/appleMapKitController');

const router = express.Router();

router.post('/snapshot', authMiddleware, generateMapSnapshot);
router.post('/snapshot-url', authMiddleware, generateMapSnapshotUrl);
router.post('/snapshot-urls', authMiddleware, generateMapSnapshotUrls);
router.post('/snapshot-upload', authMiddleware, generateMapSnapshotAndUpload);

module.exports = router;