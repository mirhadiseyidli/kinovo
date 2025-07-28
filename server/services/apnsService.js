const apn = require('node-apn');

// Simple logger configuration for APNs
const logger = {
  info: (message, meta) => console.log('ℹ️ APNs:', message, meta || ''),
  warn: (message, meta) => console.warn('⚠️ APNs:', message, meta || ''),
  error: (message, meta) => console.error('❌ APNs:', message, meta || '')
};

class APNsService {
  constructor() {
    this.provider = null;
    this.initializeProvider();
  }

  /**
   * Initialize APNs provider with existing Apple credentials
   */
  initializeProvider() {
    try {
      // Check if APNs-specific credentials are available
      let apnsKey = process.env.APNS_PRIVATE_KEY || process.env.APPLE_WEATHER_PRIVATE_KEY;
      const apnsKeyId = process.env.APNS_KEY_ID || process.env.APPLE_WEATHER_KEY_ID;
      const teamId = process.env.APPLE_TEAM_ID;

      // Handle escaped newlines in environment variables (common issue)
      if (apnsKey && apnsKey.includes('\\n')) {
        apnsKey = apnsKey.replace(/\\n/g, '\n');
      }
      
      // Clean up any extra whitespace or weird characters
      if (apnsKey) {
        apnsKey = apnsKey.trim();
      }

      if (!apnsKey || !apnsKeyId || !teamId) {
        throw new Error('Missing APNs credentials. Please set APNS_PRIVATE_KEY, APNS_KEY_ID, and APPLE_TEAM_ID environment variables');
      }

      // Debug credential info (without exposing the actual key)
      logger.info('APNs credentials check:', {
        keyId: apnsKeyId,
        teamId: teamId,
        keyLength: apnsKey.length,
        keyStartsWith: apnsKey.substring(0, 30) + '...',
        hasNewlines: apnsKey.includes('\n'),
        production: process.env.NODE_ENV === 'production'
      });

      // Ensure the private key is properly formatted
      let formattedKey = apnsKey;
      
      // If the key doesn't start with -----BEGIN PRIVATE KEY-----, it might be base64 encoded
      if (!formattedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        // Try to format it as a proper PEM key
        if (!formattedKey.includes('\n')) {
          // If it's all on one line, try to format it
          formattedKey = '-----BEGIN PRIVATE KEY-----\n' + 
                        formattedKey.replace(/(.{64})/g, '$1\n') + 
                        '\n-----END PRIVATE KEY-----';
        }
      }

      const options = {
        token: {
          key: formattedKey,
          keyId: apnsKeyId,
          teamId: teamId
        },
        production: process.env.NODE_ENV === 'production'
      };

      this.provider = new apn.Provider(options);
      logger.info('APNs Provider initialized successfully', {
        keyId: apnsKeyId,
        teamId: teamId,
        production: process.env.NODE_ENV === 'production'
      });
    } catch (error) {
      logger.error('Failed to initialize APNs Provider:', error);
      throw error;
    }
  }

  /**
   * Send a push notification to a single device
   * @param {string} token - APNs device token
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   */
  async sendToToken(token, notification, data = {}) {
    try {
      if (!this.provider) {
        throw new Error('APNs Provider not initialized');
      }

      const note = new apn.Notification();
      
      // Notification content
      note.alert = {
        title: notification.title,
        body: notification.body
      };
      
      // Set APNs properties - match current FCM setup
      const bundleId = process.env.APPLE_BUNDLE_ID;
      
      if (!bundleId) {
        throw new Error('APPLE_BUNDLE_ID environment variable is required');
      }
      
      note.topic = bundleId;
      note.badge = 1;
      note.sound = 'default';
      note.contentAvailable = 1; // Enable background processing for push-to-fetch
      note.mutableContent = 1;
      
      logger.info('Sending APNs notification:', {
        deviceToken: token.substring(0, 20) + '...',
        topic: bundleId,
        title: notification.title,
        payload: data
      });
      
      // Custom payload with data
      note.payload = {
        ...data,
        // Convert all values to strings (APNs requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {})
      };

      // Set expiry (24 hours)
      note.expiry = Math.floor(Date.now() / 1000) + 24 * 3600;
      
      // Send notification
      const result = await this.provider.send(note, token);
      
      // Handle result
      if (result.sent.length > 0) {
        logger.info('APNs message sent successfully:', {
          deviceToken: token.substring(0, 20) + '...',
          sent: result.sent.length
        });
        return { success: true, messageId: result.sent[0].device };
      } else if (result.failed.length > 0) {
        const failure = result.failed[0];
        const errorMsg = failure.status === 403 
          ? 'APNs authentication failed - check your APNs credentials (Key ID, Team ID, and Private Key)'
          : 'APNs notification failed';
          
        logger.warn(errorMsg, {
          deviceToken: token.substring(0, 20) + '...',
          error: failure.error,
          status: failure.status,
          response: failure.response
        });
        return { 
          success: false, 
          error: failure.error,
          shouldRemoveToken: this.shouldRemoveToken(failure.status)
        };
      }
    } catch (error) {
      logger.error('APNs send error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array} tokens - Array of APNs device tokens
   * @param {Object} notification - Notification payload  
   * @param {Object} data - Data payload
   */
  async sendToMultipleTokens(tokens, notification, data = {}) {
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    const results = await Promise.all(
      tokens.slice(0, 500).map(token => // Limit to 500 like FCM
        this.sendToToken(token, notification, data)
      )
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);
    const invalidTokens = [];

    // Collect invalid tokens
    failed.forEach((result, index) => {
      if (result.shouldRemoveToken) {
        invalidTokens.push(tokens[index]);
      }
    });

    logger.info(`APNs multicast sent: ${successful} successful, ${failed.length} failed`);

    return {
      success: successful > 0,
      successCount: successful,
      failureCount: failed.length,
      invalidTokens
    };
  }

  /**
   * Send notification based on notification type - EXACT match to current FCM service
   * @param {Array|string} tokens - APNs token(s)
   * @param {string} type - Notification type
   * @param {Object} payload - Notification payload
   */
  async sendNotificationByType(tokens, type, payload) {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    
    if (tokenArray.length === 0) {
      return { success: false, error: 'No valid tokens' };
    }

    let notification = {};
    let data = { type };

    switch (type) {
      case 'friend_request':
        notification = {
          title: 'New Friend Request',
          body: `${payload.senderName} sent you a friend request`
        };
        data.userId = payload.senderId;
        break;

      case 'friend_request_accepted':
        notification = {
          title: 'Friend Request Accepted',
          body: `${payload.senderName} accepted your friend request`
        };
        data.userId = payload.senderId;
        break;

      case 'event_invitation':
        notification = {
          title: 'Event Invitation',
          body: payload.inviterName
            ? `${payload.inviterName} invited you to "${payload.eventTitle}"`
            : `You're invited to "${payload.eventTitle}"`
        };
        data.eventId = payload.eventId;
        if (payload.inviterName) data.inviterName = payload.inviterName;
        break;

      case 'event_updated':
        notification = {
          title: payload.isCancellation ? 'Event Cancelled' : 'Event Update',
          body: payload.isCancellation 
            ? `"${payload.eventTitle}" has been cancelled`
            : `"${payload.eventTitle}" has been updated`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_reminder_10_mins':
        notification = {
          title: 'Event Reminder',
          body: `"${payload.eventTitle}" starts in 10 minutes`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_reminder_1_hour':
        notification = {
          title: 'Event Reminder',
          body: `"${payload.eventTitle}" starts in 1 hour`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_attendance_confirmed':
        notification = {
          title: 'Event Attendance Confirmed',
          body: `${payload.attendeeName} is attending "${payload.eventTitle}"`
        };
        data.eventId = payload.eventId;
        break;

      case 'new_event_from_friend':
        notification = {
          title: 'New Event from Friend',
          body: `${payload.creatorName} created "${payload.eventTitle}"`
        };
        data.eventId = payload.eventId;
        break;

      case 'new_event_nearby':
        notification = {
          title: 'New Event Nearby',
          body: `"${payload.eventTitle}" is happening near you`
        };
        data.eventId = payload.eventId;
        break;

      case 'someone_from_contacts_joined':
        notification = {
          title: 'Contact Joined Kinovo',
          body: `${payload.contactName} from your contacts just joined Kinovo`
        };
        data.userId = payload.userId;
        break;

      default:
        notification = {
          title: payload.title || 'Kinovo Notification',
          body: payload.body || 'You have a new notification'
        };
        break;
    }

    // Add image if provided (APNs supports images in rich notifications)
    if (payload.imageUrl) {
      data.imageUrl = payload.imageUrl;
    }

    // Send to single token or multiple tokens
    if (tokenArray.length === 1) {
      console.log('sending to single APNs token', tokenArray[0]);
      return await this.sendToToken(tokenArray[0], notification, data);
    } else {
      return await this.sendToMultipleTokens(tokenArray, notification, data);
    }
  }

  /**
   * Determine if device token should be removed based on APNs error
   * @param {string} status - APNs error status
   * @returns {boolean} Whether token should be removed
   */
  shouldRemoveToken(status) {
    // Remove tokens for permanent failures
    const removeStatuses = [
      'BadDeviceToken',
      'Unregistered',
      'TopicDisallowed',
      'DeviceTokenNotForTopic'
    ];
    
    return removeStatuses.includes(status);
  }

  /**
   * Close the APNs provider connection
   */
  async shutdown() {
    if (this.provider) {
      this.provider.shutdown();
      logger.info('APNs Provider shut down');
    }
  }
}

module.exports = new APNsService();