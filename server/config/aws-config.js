const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 service object
const s3 = new AWS.S3({
  signatureVersion: 'v4'
});

// Create CloudFront service object
const cloudfront = new AWS.CloudFront();

module.exports = {
  s3,
  cloudfront,
  AWS
}; 