const sharp = require('sharp');
const { s3, cloudfront } = require('../config/aws-config');
const { v4: uuidv4 } = require('uuid');

const CDN_DOMAIN = process.env.CDN_DOMAIN || 'cdn.kinovo.app';
const S3_BUCKET = process.env.S3_BUCKET || 'kinovo-cdn';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

/**
 * Process and optimize image with enhanced options
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Processing options
 * @returns {Buffer} - Processed image buffer
 */
const processImage = async (buffer, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 85,
    format = 'jpeg',
    autoOptimize = true,
    progressive = true,
    strip = true
  } = options;

  try {
    let sharpInstance = sharp(buffer);
    
    // Get metadata
    const metadata = await sharpInstance.metadata();
    
    // Auto-optimize format based on content if enabled
    let outputFormat = format;
    if (autoOptimize) {
      if (metadata.channels === 4 || metadata.hasAlpha) {
        outputFormat = 'png'; // Preserve transparency
      } else if (metadata.width > 1920 || metadata.height > 1080) {
        outputFormat = 'webp'; // Better compression for large images
      }
    }

    // Only resize if image is larger than target dimensions
    if (metadata.width > width || metadata.height > height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: 'lanczos3' // Better quality scaling
      });
    }

    // Strip metadata for privacy and smaller file size
    if (strip) {
      sharpInstance = sharpInstance.withMetadata({ 
        exif: {}, 
        icc: outputFormat === 'jpeg' ? metadata.icc : undefined // Keep ICC for JPEG quality
      });
    }

    // Convert and optimize based on format
    switch (outputFormat) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ 
          quality, 
          progressive,
          mozjpeg: true,
          chromaSubsampling: '4:4:4' // Better quality
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ 
          quality,
          compressionLevel: 9,
          adaptiveFiltering: true
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ 
          quality,
          effort: 6,
          smartSubsample: true
        });
        break;
      case 'avif':
        sharpInstance = sharpInstance.avif({ 
          quality,
          effort: 9,
          chromaSubsampling: '4:4:4'
        });
        break;
    }

    return await sharpInstance.toBuffer();
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

/**
 * Generate multiple image variants for responsive delivery
 * @param {Buffer} buffer - Original image buffer
 * @param {string} baseKey - Base S3 key
 * @returns {Object} - Upload results for all variants
 */
const uploadImageVariants = async (buffer, baseKey) => {
  const variants = [
    { suffix: '_thumb', width: 150, height: 150, quality: 80 },
    { suffix: '_small', width: 400, height: 400, quality: 85 },
    { suffix: '_medium', width: 800, height: 600, quality: 85 },
    { suffix: '_large', width: 1200, height: 900, quality: 90 }
  ];

  const formats = ['webp', 'jpeg']; // Generate both formats
  const uploadPromises = [];

  for (const variant of variants) {
    for (const format of formats) {
      const processedBuffer = await processImage(buffer, {
        ...variant,
        format,
        autoOptimize: false
      });

      const key = baseKey.replace(/\.[^.]+$/, `${variant.suffix}.${format}`);
      const contentType = `image/${format}`;
      
      uploadPromises.push(
        uploadToS3(processedBuffer, key, contentType, {
          // Add custom cache headers for variants
          CacheControl: 'max-age=31536000, immutable', // 1 year, immutable
          Metadata: {
            'original-size': buffer.length.toString(),
            'processed-size': processedBuffer.length.toString(),
            'variant': variant.suffix,
            'format': format
          }
        })
      );
    }
  }

  // Also upload original in WebP if it's not already
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== 'webp') {
    const webpBuffer = await processImage(buffer, { 
      format: 'webp',
      quality: 90,
      autoOptimize: false 
    });
    const webpKey = baseKey.replace(/\.[^.]+$/, '.webp');
    uploadPromises.push(
      uploadToS3(webpBuffer, webpKey, 'image/webp', {
        CacheControl: 'max-age=31536000, immutable'
      })
    );
  }

  const results = await Promise.allSettled(uploadPromises);
  
  return {
    variants: results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value),
    errors: results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason)
  };
};

/**
 * Generate S3 key for file with better organization
 * @param {string} userId - User ID
 * @param {string} fileType - Type of file (profile, cover, etc.)
 * @param {string} extension - File extension
 * @param {Object} options - Additional options
 * @returns {string} - S3 key
 */
const generateS3Key = (userId, fileType = 'image', extension = 'jpg', options = {}) => {
  const { 
    timestamp = Date.now(),
    includeDate = true,
    customPath = null 
  } = options;
  
  const uuid = uuidv4().substring(0, 8);
  const dateStr = includeDate ? new Date().toISOString().split('T')[0] : '';
  
  if (customPath) {
    return `${customPath}/${timestamp}-${uuid}.${extension}`;
  }
  
  const basePath = `users/${userId}/${fileType}`;
  const datePath = includeDate ? `${dateStr}/` : '';
  
  return `${basePath}/${datePath}${timestamp}-${uuid}.${extension}`;
};

/**
 * Enhanced upload to S3 with better cache control
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 key
 * @param {string} contentType - MIME type
 * @param {Object} options - Additional S3 options
 * @returns {Object} - Upload result
 */
const uploadToS3 = async (buffer, key, contentType, options = {}) => {
  const {
    CacheControl = 'max-age=31536000', // 1 year cache
    Metadata = {},
    ACL = 'public-read',
    ...additionalOptions
  } = options;

  const params = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl,
    Metadata,
    ACL,
    ...additionalOptions
  };

  try {
    const result = await s3.upload(params).promise();
    return {
      success: true,
      s3Url: result.Location,
      cdnUrl: `https://${CDN_DOMAIN}/${key}`,
      key: key,
      size: buffer.length,
      etag: result.ETag
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Generate CloudFront signed URL for private content
 * @param {string} key - S3 key
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} - Signed URL
 */
const generateSignedUrl = (key, expiresIn = 3600) => {
  // Implementation depends on your CloudFront private key setup
  // This is a placeholder for the concept
  const url = `https://${CDN_DOMAIN}/${key}`;
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  
  // Add signed URL logic here if using private CloudFront distributions
  return `${url}?expires=${expires}`;
};

/**
 * Optimize image delivery based on user agent and device capabilities
 * @param {string} originalUrl - Original image URL
 * @param {Object} deviceInfo - Device capability information
 * @returns {string} - Optimized URL
 */
const getOptimizedImageUrl = (originalUrl, deviceInfo = {}) => {
  const {
    supportsWebP = false,
    supportsAVIF = false,
    pixelRatio = 1,
    maxWidth = 800,
    quality = 85
  } = deviceInfo;

  if (!originalUrl || !originalUrl.includes(CDN_DOMAIN)) {
    return originalUrl;
  }

  // Build transformation parameters
  const params = new URLSearchParams();
  
  // Size optimization
  if (maxWidth && maxWidth < 1200) {
    params.append('w', Math.round(maxWidth * pixelRatio).toString());
  }
  
  // Format optimization
  if (supportsAVIF) {
    params.append('f', 'avif');
  } else if (supportsWebP) {
    params.append('f', 'webp');
  }
  
  // Quality optimization
  if (quality !== 85) {
    params.append('q', quality.toString());
  }

  const queryString = params.toString();
  return queryString ? `${originalUrl}?${queryString}` : originalUrl;
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
      // Remove query parameters for key extraction
      const cleanUrl = url.split('?')[0];
      return cleanUrl.split(`${CDN_DOMAIN}/`)[1];
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
 * Enhanced image file validation
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  const minSize = 1024; // 1KB minimum

  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.'
    };
  }

  if (file.size < minSize) {
    return {
      valid: false,
      error: 'File too small. Minimum size is 1KB.'
    };
  }

  // Additional validation for image dimensions can be added here
  return { valid: true };
};

module.exports = {
  processImage,
  uploadImageVariants,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
  invalidateCloudFront,
  extractS3KeyFromUrl,
  validateImageFile,
  generateSignedUrl,
  getOptimizedImageUrl
}; 