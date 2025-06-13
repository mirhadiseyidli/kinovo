// server/services/realtimeSyncService.js
const { admin, db } = require('../config/firebase-admin');
const User = require('../database/schemas/usersSchema');
const Event = require('../database/schemas/eventsSchema');
const Notification = require('../database/schemas/notificationsSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');

// References to key paths in the database
const refs = {
  friendRequests: db.ref('friend_requests'),
  friendActivities: db.ref('friend_activities'),
  notifications: db.ref('notifications'),
  aiSummaries: db.ref('ai_summaries'),
  userStatus: db.ref('user_status'),
};

/**
 * Synchronize a friend request to Firebase
 * @param {string} receiverId - User ID receiving the request
 * @param {Object} requestData - Friend request data
 */
const syncFriendRequest = async (receiverId, requestData) => {
  try {
    const userRef = refs.friendRequests.child(receiverId);
    await userRef.child(requestData._id.toString()).set({
      _id: requestData._id.toString(),
      from: typeof requestData.from === 'object' ? 
        requestData.from._id.toString() : 
        requestData.from.toString(),
      to: typeof requestData.to === 'object' ? 
        requestData.to._id.toString() : 
        requestData.to.toString(),
      status: requestData.status,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      created_at: requestData.created_at instanceof Date ? 
        requestData.created_at.toISOString() : 
        requestData.created_at
    });
    console.log(`Friend request synced to Firebase for user ${receiverId}`);
  } catch (error) {
    console.error('Error syncing friend request to Firebase:', error);
  }
};

/**
 * Synchronize friend activity to Firebase
 * @param {string} userId - User ID to receive the activity update
 * @param {Object} activityData - Friend activity data
 */
const syncFriendActivity = async (userId, activityData) => {
  try {
    const userRef = refs.friendActivities.child(userId);
    await userRef.child(activityData._id.toString()).set({
      _id: activityData._id.toString(),
      type: activityData.type,
      friend: typeof activityData.friend === 'object' ? 
        activityData.friend._id.toString() : 
        activityData.friend.toString(),
      details: activityData.details || {},
      timestamp: admin.database.ServerValue.TIMESTAMP,
      created_at: activityData.created_at instanceof Date ? 
        activityData.created_at.toISOString() : 
        activityData.created_at
    });
    console.log(`Friend activity synced to Firebase for user ${userId}`);
  } catch (error) {
    console.error('Error syncing friend activity to Firebase:', error);
  }
};

/**
 * Synchronize notification to Firebase
 * @param {string} userId - User ID to receive the notification
 * @param {Object} notificationData - Notification data
 */
const syncNotification = async (userId, notificationData) => {
  try {
    const userRef = refs.notifications.child(userId);
    await userRef.child(notificationData._id.toString()).set({
      _id: notificationData._id.toString(),
      title: notificationData.title,
      body: notificationData.body,
      type: notificationData.type,
      data: notificationData.data || {},
      read: notificationData.read || false,
      is_seen: notificationData.is_seen || false,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      created_at: notificationData.created_at instanceof Date ? 
        notificationData.created_at.toISOString() : 
        notificationData.created_at
    });
    console.log(`Notification synced to Firebase for user ${userId}`);
  } catch (error) {
    console.error('Error syncing notification to Firebase:', error);
  }
};

/**
 * Mark notification as read in Firebase
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID to mark as read
 */
const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = refs.notifications.child(userId).child(notificationId);
    await notificationRef.update({
      read: true,
      is_seen: true,
      read_at: admin.database.ServerValue.TIMESTAMP
    });
    console.log(`Notification ${notificationId} marked as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking notification as read in Firebase:', error);
  }
};

/**
 * Synchronize AI summary to Firebase
 * @param {string} userId - User ID
 * @param {Object} summaryData - AI summary data
 */
const syncAISummary = async (userId, summaryData) => {
  try {
    const userRef = refs.aiSummaries.child(userId);
    await userRef.set({
      content: summaryData.content,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      generated_at: summaryData.generated_at instanceof Date ? 
        summaryData.generated_at.toISOString() : 
        summaryData.generated_at
    });
    console.log(`AI summary synced to Firebase for user ${userId}`);
  } catch (error) {
    console.error('Error syncing AI summary to Firebase:', error);
  }
};

/**
 * Update user online status
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Whether the user is online
 */
const updateUserStatus = async (userId, isOnline) => {
  try {
    const statusRef = refs.userStatus.child(userId);
    await statusRef.update({
      online: isOnline,
      lastActive: admin.database.ServerValue.TIMESTAMP
    });
    console.log(`User status updated for user ${userId}: online=${isOnline}`);
  } catch (error) {
    console.error('Error updating user status in Firebase:', error);
  }
};

/**
 * Bulk sync all user notifications to Firebase
 * @param {string} userId - User ID
 */
const syncAllNotifications = async (userId) => {
  try {
    const notifications = await Notification.find({ user: userId });
    
    if (!notifications.length) {
      console.log(`No notifications found for user ${userId}`);
      return;
    }
    
    const notificationsRef = refs.notifications.child(userId);
    
    // Clear existing notifications first to prevent duplicates or stale data
    await notificationsRef.remove();
    
    // Create a batch update object
    const updates = {};
    notifications.forEach(notification => {
      updates[notification._id.toString()] = {
        _id: notification._id.toString(),
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: notification.data || {},
        read: notification.read || false,
        is_seen: notification.is_seen || false,
        timestamp: notification.created_at instanceof Date ? 
          notification.created_at.getTime() : 
          Date.now(),
        created_at: notification.created_at instanceof Date ? 
          notification.created_at.toISOString() : 
          new Date().toISOString()
      };
    });
    
    // Perform the update
    await notificationsRef.update(updates);
    console.log(`Synced ${notifications.length} notifications for user ${userId}`);
  } catch (error) {
    console.error('Error bulk syncing notifications to Firebase:', error);
  }
};

/**
 * Sync friend request status update
 * @param {string} requestId - Friend request ID
 * @param {string} status - New status (accepted, rejected)
 */
const syncFriendRequestStatusUpdate = async (requestId, status) => {
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      console.error(`Friend request ${requestId} not found`);
      return;
    }
    
    // Update for both sender and receiver
    const senderId = request.from.toString();
    const receiverId = request.to.toString();
    
    // Update in sender's requests
    const senderRef = refs.friendRequests.child(senderId).child(requestId);
    await senderRef.update({ status, updated_at: admin.database.ServerValue.TIMESTAMP });
    
    // Update in receiver's requests
    const receiverRef = refs.friendRequests.child(receiverId).child(requestId);
    await receiverRef.update({ status, updated_at: admin.database.ServerValue.TIMESTAMP });
    
    console.log(`Friend request ${requestId} updated to ${status}`);
    
    // If accepted, create friend activities for both users
    if (status === 'accepted') {
      const activityId = new mongoose.Types.ObjectId().toString();
      
      // Create activity for sender
      await syncFriendActivity(senderId, {
        _id: activityId,
        type: 'new_friend',
        friend: receiverId,
        created_at: new Date()
      });
      
      // Create activity for receiver
      await syncFriendActivity(receiverId, {
        _id: activityId,
        type: 'new_friend',
        friend: senderId,
        created_at: new Date()
      });
    }
  } catch (error) {
    console.error(`Error syncing friend request status update:`, error);
  }
};

// Export all functions
module.exports = {
  syncFriendRequest,
  syncFriendActivity,
  syncNotification,
  markNotificationAsRead,
  syncAISummary,
  updateUserStatus,
  syncAllNotifications,
  syncFriendRequestStatusUpdate
};