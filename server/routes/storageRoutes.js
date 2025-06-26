// server/routes/storageRoutes.js
const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const {
  uploadProfilePicture,
  uploadCoverPhoto,
  uploadImage,
  deleteImage,
  getCDNInfo
} = require('../controllers/storageController');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow 1 file per upload
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  }
});

const router = express.Router();

// Upload endpoints
router.post('/upload/profile-picture', 
  authMiddleware, 
  upload.single('profilePicture'), 
  uploadProfilePicture
);

router.post('/upload/cover-photo', 
  authMiddleware, 
  upload.single('coverPhoto'), 
  uploadCoverPhoto
);

router.post('/upload/image', 
  authMiddleware, 
  upload.single('image'), 
  uploadImage
);

// Delete endpoint
router.delete('/delete', authMiddleware, deleteImage);

// Info endpoint
router.get('/info', authMiddleware, getCDNInfo);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only 1 file allowed per upload.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Server error during file upload'
  });
});

module.exports = router;