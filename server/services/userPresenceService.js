const UserPresence = require('../database/schemas/userPresenceSchema');
const APNsToken = require('../database/schemas/apnsTokenSchema');
const apnsService = require('./apnsService');
// Simple logger for user presence
const logger = {
  info: (message, meta) => console.log('ℹ️ Presence:', message, meta || ''),
  warn: (message, meta) => console.warn('⚠️ Presence:', message, meta || ''),
  error: (message, meta) => console.error('❌ Presence:', message, meta || '')
};

class UserPresenceService {
  constructor() {
    this.presenceTimeouts = new Map(); // Track user timeouts for auto-offline
  }

  /**
   * Set user online and notify friends
   * @param {string} userId - User ID
   * @param {Array} friendIds - Array of friend user IDs
   */
  async setUserOnline(userId, friendIds = []) {
    try {
      // Clear any existing timeout for this user
      if (this.presenceTimeouts.has(userId)) {
        clearTimeout(this.presenceTimeouts.get(userId));
        this.presenceTimeouts.delete(userId);
      }

      // Update user presence
      const presence = await UserPresence.setUserOnline(userId);
      
      // DISABLED: Notify friends that user is online
      // if (friendIds.length > 0) {
      //   await this.notifyFriendsOfPresenceChange(userId, friendIds, true);
      // }

      // Set auto-offline timeout (30 minutes of inactivity)
      const timeout = setTimeout(async () => {
        await this.setUserOffline(userId, friendIds);
        this.presenceTimeouts.delete(userId);
      }, 30 * 60 * 1000); // 30 minutes

      this.presenceTimeouts.set(userId, timeout);

      return presence;
    } catch (error) {
      logger.error('Error setting user online:', error);
      throw error;
    }
  }

  /**
   * Set user offline and notify friends
   * @param {string} userId - User ID
   * @param {Array} friendIds - Array of friend user IDs
   */
  async setUserOffline(userId, friendIds = []) {
    try {
      // Clear timeout if exists
      if (this.presenceTimeouts.has(userId)) {
        clearTimeout(this.presenceTimeouts.get(userId));
        this.presenceTimeouts.delete(userId);
      }

      // Update user presence
      const presence = await UserPresence.setUserOffline(userId);
      
      // DISABLED: Notify friends that user is offline
      // if (friendIds.length > 0) {
      //   await this.notifyFriendsOfPresenceChange(userId, friendIds, false);
      // }

      return presence;
    } catch (error) {
      logger.error('Error setting user offline:', error);
      throw error;
    }
  }

  /**
   * Update user's last active timestamp (heartbeat)
   * @param {string} userId - User ID
   * @param {Array} friendIds - Array of friend user IDs
   */
  async updateLastActive(userId, friendIds = []) {
    try {
      // Refresh the online status and reset timeout
      return await this.setUserOnline(userId, friendIds);
    } catch (error) {
      logger.error('Error updating last active:', error);
      throw error;
    }
  }

  /**
   * Get user's current presence
   * @param {string} userId - User ID
   * @returns {Object} User presence data
   */
  async getUserPresence(userId) {
    try {
      return await UserPresence.getUserPresence(userId);
    } catch (error) {
      logger.error('Error getting user presence:', error);
      throw error;
    }
  }

  /**
   * Get presence for multiple friends
   * @param {Array} userIds - Array of user IDs
   * @returns {Array} Array of user presence data
   */
  async getFriendsPresence(userIds) {
    try {
      return await UserPresence.getFriendsPresence(userIds);
    } catch (error) {
      logger.error('Error getting friends presence:', error);
      throw error;
    }
  }

  /**
   * Get all online users
   * @returns {Array} Array of online users
   */
  async getOnlineUsers() {
    try {
      return await UserPresence.getOnlineUsers();
    } catch (error) {
      logger.error('Error getting online users:', error);
      throw error;
    }
  }

  /**
   * Notify friends of user presence change via push notifications
   * @param {string} userId - User ID whose presence changed
   * @param {Array} friendIds - Array of friend user IDs to notify
   * @param {boolean} isOnline - Whether user went online or offline
   */
  async notifyFriendsOfPresenceChange(userId, friendIds, isOnline) {
    try {
      // Get the user info for the notification
      const UserPresence = require('../database/schemas/userPresenceSchema');
      const presence = await UserPresence.getUserPresence(userId);
      
      if (!presence || !presence.userId) return;

      // Only notify when user comes online (not offline to avoid spam)
      if (!isOnline) return;

      // Get APNs tokens for friends
      const tokens = await APNsToken.findActiveTokensByUserIds(friendIds);
      
      if (tokens.length === 0) return;

      const deviceTokens = tokens.map(t => t.token);
      
      // Send presence notification
      await apnsService.sendNotificationByType(
        deviceTokens,
        'user_presence_update',
        {
          friendName: presence.userId.full_name || presence.userId.username,
          userId: userId
        }
      );

    } catch (error) {
      logger.error('Error notifying friends of presence change:', error);
    }
  }

  /**
   * Clean up old presence data
   */
  async cleanupOldPresences() {
    try {
      await UserPresence.cleanupOldStatuses();
    } catch (error) {
      logger.error('Error cleaning up old presences:', error);
    }
  }

  /**
   * Handle app termination - set all users offline
   */
  async handleShutdown() {
    try {
      // Clear all timeouts
      for (const timeout of this.presenceTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.presenceTimeouts.clear();

    } catch (error) {
      logger.error('Error during presence service shutdown:', error);
    }
  }
}

module.exports = new UserPresenceService();