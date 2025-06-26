const sharp = require('sharp');
const { s3, cloudfront } = require('../config/aws-config');
const { v4: uuidv4 } = require('uuid');

const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.kinovo.app';
const S3_BUCKET = process.env.S3_BUCKET || 'kinovo-cdn';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

/**
 * Process and optimize image
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Processing options
 * @returns {Buffer} - Processed image buffer
 */
const processImage = async (buffer, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    let sharpInstance = sharp(buffer);
    
    // Get metadata
    const metadata = await sharpInstance.metadata();
    
    // Only resize if image is larger than target dimensions
    if (metadata.width > width || metadata.height > height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert and optimize
    if (format === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Generate S3 key for file
 * @param {string} userId - User ID
 * @param {string} fileType - Type of file (profile, cover, etc.)
 * @param {string} extension - File extension
 * @returns {string} - S3 key
 */
const generateS3Key = (userId, fileType = 'image', extension = 'jpg') => {
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  return `users/${userId}/${fileType}/${timestamp}-${uuid}.${extension}`;
};

/**
 * Upload file to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 key
 * @param {string} contentType - MIME type
 * @returns {Object} - Upload result
 */
const uploadToS3 = async (buffer, key, contentType) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year cache
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      success: true,
      s3Url: result.Location,
      cdnUrl: `https://${CDN_DOMAIN}/${key}`,
      key: key
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 key
 * @returns {boolean} - Success status
 */
const deleteFromS3 = async (key) => {
  const params = {
    Bucket: S3_BUCKET,
    Key: key
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
};

/**
 * Create CloudFront invalidation
 * @param {string|Array} paths - Paths to invalidate
 * @returns {Object} - Invalidation result
 */
const invalidateCloudFront = async (paths) => {
  if (!CLOUDFRONT_DISTRIBUTION_ID) {
    console.warn('CloudFront distribution ID not configured');
    return { success: false, message: 'CloudFront not configured' };
  }

  const pathArray = Array.isArray(paths) ? paths : [paths];
  const params = {
    DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: `invalidation-${Date.now()}`,
      Paths: {
        Quantity: pathArray.length,
        Items: pathArray.map(path => path.startsWith('/') ? path : `/${path}`)
      }
    }
  };

  try {
    const result = await cloudfront.createInvalidation(params).promise();
    return {
      success: true,
      invalidationId: result.Invalidation.Id
    };
  } catch (error) {
    console.error('Error creating CloudFront invalidation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Extract S3 key from CDN URL
 * @param {string} url - CDN URL
 * @returns {string|null} - S3 key or null
 */
const extractS3KeyFromUrl = (url) => {
  if (!url) return null;
  
  try {
    if (url.includes(CDN_DOMAIN)) {
      return url.split(`${CDN_DOMAIN}/`)[1];
    }
    if (url.includes('amazonaws.com')) {
      const urlParts = url.split('/');
      return urlParts.slice(urlParts.indexOf(S3_BUCKET) + 1).join('/');
    }
    return null;
  } catch (error) {
    console.error('Error extracting S3 key:', error);
    return null;
  }
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  return { valid: true };
};

module.exports = {
  processImage,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
  invalidateCloudFront,
  extractS3KeyFromUrl,
  validateImageFile,
  CDN_DOMAIN,
  S3_BUCKET
}; 