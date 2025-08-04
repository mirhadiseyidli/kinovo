require('dotenv').config();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const { uploadToS3, generateS3Key } = require('../utils/cdnUtils');

const TEAM_ID = process.env.APPLE_TEAM_ID;
const KEY_ID = process.env.APPLE_WEATHER_KEY_ID;
const SERVICE_ID = process.env.APPLE_MAPS_IDENTIFIER || process.env.APPLE_BUNDLE_ID;
const privateKey = process.env.APPLE_WEATHER_PRIVATE_KEY.replace(/\\n/g, '\n');

class AppleMapKitService {
  constructor() {
    this.tokenCache = null;
    this.tokenExpiry = null;
  }

  generateAuthToken() {
    const now = Math.floor(Date.now() / 1000);
    const expires = now + 60 * 60; // 1 hour max

    // Create Maps auth token as per Apple docs
    const payload = {
      iss: TEAM_ID,
      iat: now,
      exp: expires,
      origin: SERVICE_ID
    };

    return jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: KEY_ID,
      header: {
        alg: 'ES256',
        kid: KEY_ID,
        typ: 'JWT'
      }
    });
  }

  generateSnapshotSignature(completePath) {
    // Create signature for Maps Web Snapshots using ES256 (ECDSA P-256 + SHA256)
    const sign = crypto.createSign('SHA256');
    sign.update(completePath);
    sign.end();
    
    const signature = sign.sign(privateKey, 'base64url');
    return signature;
  }

  async getMapsToken() {
    const now = Math.floor(Date.now() / 1000);
    
    if (this.tokenCache && this.tokenExpiry && this.tokenExpiry > now + 300) {
      return this.tokenCache;
    }

    // For MapKit snapshots, we use the JWT token directly
    const jwtToken = this.generateAuthToken();
    
    this.tokenCache = jwtToken;
    this.tokenExpiry = now + 1800; // 30 minutes (JWT expiry minus buffer)
    
    return jwtToken;
  }

  async getSnapshot(options) {
    const {
      lat,
      lon,
      width = 640,
      height = 265,
      scale = 2,
      zoom = 15,
      mapType = 'standard',
      colorScheme = 'light',
      showsBuildings = true,
      showsPointsOfInterest = true,
      annotations = []
    } = options;

    // Step 1: Create initial parameters (without teamId, keyId, signature)
    const snapshotParams = {
      center: `${lat},${lon}`,
      size: `${width}x${height}`,
      scale: scale,
      z: zoom,
      mapType: mapType,
      colorScheme: colorScheme,
      poi: showsPointsOfInterest ? 1 : 0
    };

    // Add mountain green pin annotation at the center location
    const pinAnnotation = {
      point: `${lat},${lon}`,
      markerStyle: 'large',    // Use large style for comparison
      color: '15b8a7'          // Mountain green color (hex without #)
    };

    // Combine custom pin with any additional annotations
    const allAnnotations = [pinAnnotation, ...(annotations || [])];
    snapshotParams.annotations = JSON.stringify(allAnnotations);

    // Step 2: Create query string with initial parameters
    const initialParams = new URLSearchParams(snapshotParams).toString();
    
    // Step 3: Add teamId and keyId to create complete path for signing
    const completePath = `/api/v1/snapshot?${initialParams}&teamId=${TEAM_ID}&keyId=${KEY_ID}`;
    
    // Step 4: Generate signature for the complete path
    const signature = this.generateSnapshotSignature(completePath);
    
    // Step 5: Create final URL with signature as the last parameter
    const finalUrl = `https://snapshot.apple-mapkit.com${completePath}&signature=${signature}`;

    const response = await axios.get(finalUrl, {
      headers: {
        'Accept': 'image/png'
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  }

  async getSnapshotAndUploadToS3(options) {
    try {
      // Generate both light and dark snapshots
      const lightOptions = { ...options, colorScheme: 'light' };
      const darkOptions = { ...options, colorScheme: 'dark' };
      
      const [lightImageBuffer, darkImageBuffer] = await Promise.all([
        this.getSnapshot(lightOptions),
        this.getSnapshot(darkOptions)
      ]);
      
      // Generate S3 keys for both versions
      const lightS3Key = generateS3Key(
        options.userId || 'system',
        'map-snapshots',
        'png',
        {
          customPath: `events/${options.eventId || 'temp'}/maps/light`,
          includeDate: true
        }
      );
      
      const darkS3Key = generateS3Key(
        options.userId || 'system',
        'map-snapshots',
        'png',
        {
          customPath: `events/${options.eventId || 'temp'}/maps/dark`,
          includeDate: true
        }
      );
      
      // Upload both versions to S3
      const [lightUploadResult, darkUploadResult] = await Promise.all([
        uploadToS3(
          lightImageBuffer, 
          lightS3Key, 
          'image/png',
          {
            CacheControl: 'max-age=31536000, immutable',
            Metadata: {
              'event-id': options.eventId || 'none',
              'location': `${options.lat},${options.lon}`,
              'generated-by': 'apple-mapkit',
              'color-scheme': 'light'
            }
          }
        ),
        uploadToS3(
          darkImageBuffer, 
          darkS3Key, 
          'image/png',
          {
            CacheControl: 'max-age=31536000, immutable',
            Metadata: {
              'event-id': options.eventId || 'none',
              'location': `${options.lat},${options.lon}`,
              'generated-by': 'apple-mapkit',
              'color-scheme': 'dark'
            }
          }
        )
      ]);
      
      return {
        light: lightUploadResult,
        dark: darkUploadResult
      };
    } catch (error) {
      console.error('MapKit snapshot S3 upload error:', error);
      throw error;
    }
  }

  buildSnapshotUrl(options) {
    const {
      lat,
      lon,
      width = 640,
      height = 265,
      scale = 2,
      zoom = 15,
      mapType = 'standard',
      colorScheme = 'light',
      showsBuildings = true,
      showsPointsOfInterest = true,
      annotations = []
    } = options;

    const snapshotParams = {
      center: `${lat},${lon}`,
      size: `${width}x${height}`,
      scale: scale,
      z: zoom,
      mapType: mapType,
      colorScheme: colorScheme,
      poi: showsPointsOfInterest ? 1 : 0
    };

    // Add mountain green pin annotation at the center location
    const pinAnnotation = {
      point: `${lat},${lon}`,
      markerStyle: 'large',    // Use large style for comparison
      color: '15b8a7'          // Mountain green color (hex without #)
    };

    // Combine custom pin with any additional annotations
    const allAnnotations = [pinAnnotation, ...(annotations || [])];
    snapshotParams.annotations = JSON.stringify(allAnnotations);

    const queryString = new URLSearchParams(snapshotParams).toString();
    return `https://snapshot.apple-mapkit.com/api/v1/snapshot?${queryString}`;
  }

  buildSignedSnapshotUrl(options) {
    const {
      lat,
      lon,
      width = 640,
      height = 265,
      scale = 2,
      zoom = 15,
      mapType = 'standard',
      colorScheme = 'light',
      showsBuildings = true,
      showsPointsOfInterest = true,
      annotations = []
    } = options;

    // Step 1: Create initial parameters (without teamId, keyId, signature)
    const snapshotParams = {
      center: `${lat},${lon}`,
      size: `${width}x${height}`,
      scale: scale,
      z: zoom,
      mapType: mapType,
      colorScheme: colorScheme,
      poi: showsPointsOfInterest ? 1 : 0
    };

    // Add mountain green pin annotation at the center location
    const pinAnnotation = {
      point: `${lat},${lon}`,
      markerStyle: 'large',    // Use large style for comparison
      color: '15b8a7'          // Mountain green color (hex without #)
    };

    // Combine custom pin with any additional annotations
    const allAnnotations = [pinAnnotation, ...(annotations || [])];
    snapshotParams.annotations = JSON.stringify(allAnnotations);

    // Step 2: Create query string with initial parameters
    const initialParams = new URLSearchParams(snapshotParams).toString();
    
    // Step 3: Add teamId and keyId to create complete path for signing
    const completePath = `/api/v1/snapshot?${initialParams}&teamId=${TEAM_ID}&keyId=${KEY_ID}`;
    
    // Step 4: Generate signature for the complete path
    const signature = this.generateSnapshotSignature(completePath);
    
    // Step 5: Create final URL with signature as the last parameter
    const finalUrl = `https://snapshot.apple-mapkit.com${completePath}&signature=${signature}`;

    return finalUrl;
  }
}

module.exports = new AppleMapKitService();