const admin = require('firebase-admin');
const logger = require('winston');

class FCMService {
  constructor() {
    this.messaging = admin.messaging();
  }

  /**
   * Send a push notification to a single device
   * @param {string} token - FCM token
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   */
  async sendToToken(token, notification, data = {}) {
    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          // Ensure all data values are strings
          ...Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
          }, {})
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400) // 24 hours
          },
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: 1,
              sound: 'default',
              'content-available': 1,
              'mutable-content': 1
            }
          }
        }
      };

      const response = await this.messaging.send(message);
      logger.info('FCM message sent successfully:', response);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error('FCM send error:', error);
      
      // Handle specific error cases
      if (error.code === 'messaging/registration-token-not-registered') {
        logger.warn('FCM token is no longer valid:', token);
        return { success: false, error: 'invalid_token', shouldRemoveToken: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   * @param {Array} tokens - Array of FCM tokens
   * @param {Object} notification - Notification payload
   * @param {Object} data - Data payload
   */
  async sendToMultipleTokens(tokens, notification, data = {}) {
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          // Ensure all data values are strings
          ...Object.keys(data).reduce((acc, key) => {
            acc[key] = String(data[key]);
            return acc;
          }, {})
        },
        tokens: tokens.slice(0, 500), // FCM limit is 500 tokens per batch
        android: {
          notification: {
            channelId: 'kinovo_notifications',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
          priority: 'high',
          ttl: 86400000, // 24 hours
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400) // 24 hours
          },
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              badge: 1,
              sound: 'default'
            }
          }
        }
      };

      const response = await this.messaging.sendMulticast(message);
      
      // Log results
      logger.info(`FCM multicast sent: ${response.successCount} successful, ${response.failureCount} failed`);
      
      // Handle failed tokens
      const invalidTokens = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (error.code === 'messaging/registration-token-not-registered') {
              invalidTokens.push(tokens[idx]);
            }
            logger.warn(`FCM send failed for token ${idx}:`, error.message);
          }
        });
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens
      };
    } catch (error) {
      logger.error('FCM multicast error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification based on notification type
   * @param {Array|string} tokens - FCM token(s)
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
          body: `${payload.senderName} wants to be your friend`
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
          body: `You're invited to "${payload.eventTitle}"`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_update':
        notification = {
          title: 'Event Update',
          body: `"${payload.eventTitle}" has been updated`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_reminder':
        notification = {
          title: 'Event Reminder',
          body: `"${payload.eventTitle}" starts in ${payload.timeUntil}`
        };
        data.eventId = payload.eventId;
        break;

      case 'event_cancelled':
        notification = {
          title: 'Event Cancelled',
          body: `"${payload.eventTitle}" has been cancelled`
        };
        data.eventId = payload.eventId;
        break;

      default:
        notification = {
          title: payload.title || 'Kinovo Notification',
          body: payload.body || 'You have a new notification'
        };
        break;
    }

    // Add image if provided
    if (payload.imageUrl) {
      notification.imageUrl = payload.imageUrl;
    }

    // Send to single token or multiple tokens
    if (tokenArray.length === 1) {
      return await this.sendToToken(tokenArray[0], notification, data);
    } else {
      return await this.sendToMultipleTokens(tokenArray, notification, data);
    }
  }
}

module.exports = new FCMService(); 