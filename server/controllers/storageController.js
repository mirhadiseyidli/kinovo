// server/controllers/storageController.js
const { authMiddleware } = require('../utils/authMiddleware');
const {
  processImage,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
  invalidateCloudFront,
  extractS3KeyFromUrl,
  validateImageFile,
  CDN_DOMAIN
} = require('../utils/cdnUtils');
const User = require('../database/schemas/usersSchema');

/**
 * Upload profile picture to CDN
 * @route POST /api/storage/upload/profile-picture
 * @access Private
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = req.user._id;
    
    // Validate the uploaded file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
    }

    // Get current user to check for existing profile picture
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Process image for profile picture (square, optimized)
    const processedBuffer = await processImage(req.file.buffer, {
      width: 400,
      height: 400,
      quality: 90,
      format: 'jpeg'
    });

    // Generate S3 key
    const s3Key = generateS3Key(userId, 'profile', 'jpg');

    // Upload to S3
    const uploadResult = await uploadToS3(
      processedBuffer,
      s3Key,
      'image/jpeg'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload image' 
      });
    }

    // Delete old profile picture if exists
    if (user.profile_picture) {
      const oldKey = extractS3KeyFromUrl(user.profile_picture);
      if (oldKey) {
        await deleteFromS3(oldKey);
        // Optionally invalidate old image from CloudFront
        await invalidateCloudFront(oldKey);
      }
    }

    // Update user profile picture in database
    user.profile_picture = uploadResult.cdnUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        url: uploadResult.cdnUrl,
        key: uploadResult.key
      }
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during profile picture upload' 
    });
  }
};

/**
 * Upload cover photo to CDN
 * @route POST /api/storage/upload/cover-photo
 * @access Private
 */
const uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = req.user._id;
    
    // Validate the uploaded file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
    }

    // Get current user to check for existing cover photo
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Process image for cover photo (wide aspect ratio)
    const processedBuffer = await processImage(req.file.buffer, {
      width: 1200,
      height: 400,
      quality: 85,
      format: 'jpeg'
    });

    // Generate S3 key
    const s3Key = generateS3Key(userId, 'cover', 'jpg');

    // Upload to S3
    const uploadResult = await uploadToS3(
      processedBuffer,
      s3Key,
      'image/jpeg'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload image' 
      });
    }

    // Delete old cover photo if exists
    if (user.cover_photo) {
      const oldKey = extractS3KeyFromUrl(user.cover_photo);
      if (oldKey) {
        await deleteFromS3(oldKey);
        await invalidateCloudFront(oldKey);
      }
    }

    // Update user cover photo in database
    user.cover_photo = uploadResult.cdnUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cover photo uploaded successfully',
      data: {
        url: uploadResult.cdnUrl,
        key: uploadResult.key
      }
    });

  } catch (error) {
    console.error('Error uploading cover photo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during cover photo upload' 
    });
  }
};

/**
 * Upload general image to CDN
 * @route POST /api/storage/upload/image
 * @access Private
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const userId = req.user._id;
    
    // Validate the uploaded file
    const validation = validateImageFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
    }

    // Process image with default settings
    const processedBuffer = await processImage(req.file.buffer, {
      width: 1200,
      height: 1200,
      quality: 85,
      format: 'jpeg'
    });

    // Generate S3 key
    const s3Key = generateS3Key(userId, 'image', 'jpg');

    // Upload to S3
    const uploadResult = await uploadToS3(
      processedBuffer,
      s3Key,
      'image/jpeg'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload image' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: uploadResult.cdnUrl,
        key: uploadResult.key
      }
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during image upload' 
    });
  }
};

/**
 * Delete image from CDN
 * @route DELETE /api/storage/delete
 * @access Private
 */
const deleteImage = async (req, res) => {
  try {
    const { url, key } = req.body;
    const userId = req.user._id;

    if (!url && !key) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL or key is required' 
      });
    }

    let s3Key = key;
    if (!s3Key && url) {
      s3Key = extractS3KeyFromUrl(url);
    }

    if (!s3Key) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid URL or key' 
      });
    }

    // Verify the file belongs to the user
    if (!s3Key.startsWith(`users/${userId}/`)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized to delete this file' 
      });
    }

    // Delete from S3
    const deleted = await deleteFromS3(s3Key);
    
    if (!deleted) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete file' 
      });
    }

    // Invalidate from CloudFront
    await invalidateCloudFront(s3Key);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during image deletion' 
    });
  }
};

/**
 * Get CDN info
 * @route GET /api/storage/info
 * @access Private
 */
const getCDNInfo = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        cdnDomain: CDN_DOMAIN,
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        maxFileSize: '10MB',
        processing: {
          profilePicture: { width: 400, height: 400 },
          coverPhoto: { width: 1200, height: 400 },
          general: { width: 1200, height: 1200 }
        }
      }
    });
  } catch (error) {
    console.error('Error getting CDN info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = {
  uploadProfilePicture,
  uploadCoverPhoto,
  uploadImage,
  deleteImage,
  getCDNInfo
};