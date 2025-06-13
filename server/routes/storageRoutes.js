// server/routes/storageRoutes.js
const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const { getSignedUrl, deleteFile } = require('../controllers/storageController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// router.post('/upload', authMiddleware, upload.single('file'), uploadImage);
router.get('/url/:filename', authMiddleware, getSignedUrl);
router.delete('/:filename', authMiddleware, deleteFile);

module.exports = router;