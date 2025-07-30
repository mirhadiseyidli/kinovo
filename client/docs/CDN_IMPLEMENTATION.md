# CDN Image Upload System

This document describes the implementation of the CDN image upload system using AWS S3 and CloudFront.

## Overview

The CDN system provides optimized image upload, storage, and delivery using:
- **AWS S3** for storage
- **CloudFront** for global CDN delivery  
- **Sharp** for image processing and optimization
- **Multer** for file upload handling

## Architecture

```
Client App → API Endpoint → Image Processing → S3 Upload → CloudFront → CDN URL
```

## Setup Instructions

### 1. AWS Configuration

#### S3 Bucket Setup
1. Create an S3 bucket (e.g., `kinovo-cdn`)
2. Configure bucket policy for public read access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::kinovo-cdn/*"
    }
  ]
}
```

#### CloudFront Distribution Setup
1. Create a CloudFront distribution
2. Set the S3 bucket as the origin
3. Configure custom domain `cdn.kinovo.app`
4. Set appropriate cache behaviors

### 2. Environment Variables

Add these to your `.env` file:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-west-2
S3_BUCKET=kinovo-cdn
CDN_DOMAIN=cdn.kinovo.app
CLOUDFRONT_DISTRIBUTION_ID=your-cloudfront-distribution-id
```

### 3. Install Dependencies

```bash
npm install aws-sdk sharp multer
```

## API Endpoints

### Upload Endpoints

#### Upload Profile Picture
```
POST /api/storage/upload/profile-picture
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'profilePicture' field
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "url": "https://cdn.kinovo.app/users/123/profile/1234567890-abc123.jpg",
    "key": "users/123/profile/1234567890-abc123.jpg"
  }
}
```

#### Upload Cover Photo
```
POST /api/storage/upload/cover-photo
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'coverPhoto' field
```

#### Upload General Image
```
POST /api/storage/upload/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body: FormData with 'image' field
```

### Management Endpoints

#### Delete Image
```
DELETE /api/storage/delete
Authorization: Bearer <token>

Body: {
  "url": "https://cdn.kinovo.app/users/123/profile/1234567890-abc123.jpg"
}
```

#### Get CDN Info
```
GET /api/storage/info
Authorization: Bearer <token>
```

#### Get User Images
```
GET /api/users/images
Authorization: Bearer <token>
```

#### Remove Profile Picture
```
DELETE /api/users/profile-picture
Authorization: Bearer <token>
```

#### Remove Cover Photo
```
DELETE /api/users/cover-photo
Authorization: Bearer <token>
```

## Image Processing

### Profile Pictures
- **Size:** 400x400px
- **Format:** JPEG
- **Quality:** 90%
- **Fit:** Square crop

### Cover Photos
- **Size:** 1200x400px
- **Format:** JPEG
- **Quality:** 85%
- **Fit:** Wide aspect ratio

### General Images
- **Size:** 1200x1200px (max)
- **Format:** JPEG
- **Quality:** 85%
- **Fit:** Maintain aspect ratio

## File Structure

S3 files are organized as:
```
users/
  ├── {userId}/
  │   ├── profile/
  │   │   └── {timestamp}-{uuid}.jpg
  │   ├── cover/
  │   │   └── {timestamp}-{uuid}.jpg
  │   └── image/
  │       └── {timestamp}-{uuid}.jpg
```

## Security Features

- User authentication required
- File type validation (JPEG, PNG, WebP only)
- File size limits (10MB max)
- User-specific file access validation
- Automatic cleanup of old images

## Error Handling

The system handles various error scenarios:
- Invalid file types
- File size limits
- S3 upload failures
- CloudFront invalidation errors
- User authorization errors

## Performance Optimizations

- Image compression and optimization
- CloudFront edge caching
- Efficient S3 key structure
- Automatic old image cleanup
- Parallel processing where possible

## Usage Examples

### Frontend Upload (React Native)

```javascript
const uploadProfilePicture = async (imageUri) => {
  const formData = new FormData();
  formData.append('profilePicture', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  });

  try {
    const response = await fetch('/api/storage/upload/profile-picture', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Backend Usage

```javascript
const { uploadToS3, processImage, generateS3Key } = require('./utils/cdnUtils');

// Process and upload image
const processedBuffer = await processImage(originalBuffer, {
  width: 400,
  height: 400,
  quality: 90,
  format: 'jpeg'
});

const s3Key = generateS3Key(userId, 'profile', 'jpg');
const result = await uploadToS3(processedBuffer, s3Key, 'image/jpeg');
```

## Monitoring and Maintenance

### CloudWatch Metrics
- S3 upload success/failure rates  
- CloudFront cache hit ratios
- Image processing times
- API response times

### Cost Optimization
- Regular cleanup of unused images
- Efficient image compression
- CloudFront cache optimization
- S3 lifecycle policies

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check AWS credentials
   - Verify S3 bucket permissions
   - Check file size limits

2. **Image Not Loading**
   - Verify CloudFront distribution
   - Check DNS settings for CDN domain
   - Ensure proper CORS configuration

3. **Processing Errors**
   - Check Sharp library installation
   - Verify image format support
   - Monitor memory usage

## Future Enhancements

- WebP format support
- Progressive JPEG encoding
- Automatic image format detection
- Advanced cropping options
- Batch upload capabilities
- Image metadata preservation 