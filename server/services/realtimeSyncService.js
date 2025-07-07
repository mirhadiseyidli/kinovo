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
    
    // Extract sender data if it exists
    const sender = requestData.sender ? {
      _id: requestData.sender._id?.toString(),
      full_name: requestData.sender.full_name || '',
      username: requestData.sender.username || '',
      profile_picture: requestData.sender.profile_picture || ''
    } : null;
    
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
        requestData.created_at,
      // Include sender data for frontend
      ...(sender && { sender }),
      // Include mutual friends count if provided
      ...(requestData.mutualFriendsCount !== undefined && { mutualFriendsCount: requestData.mutualFriendsCount })
    });
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
    
    // Extract event and sender data if they exist
    const event = notificationData.event ? {
      _id: notificationData.event._id?.toString(),
      title: notificationData.event.title || '',
      category: notificationData.event.category || ''
    } : null;
    
    const sender = notificationData.sender ? {
      _id: notificationData.sender._id?.toString(),
      full_name: notificationData.sender.full_name || '',
      username: notificationData.sender.username || '',
      profile_picture: notificationData.sender.profile_picture || ''
    } : null;

    const friend_request = notificationData.friend_request ? {
      _id: notificationData.friend_request._id?.toString(),
      sender: notificationData.friend_request.sender ? {
        _id: notificationData.friend_request.sender._id?.toString(),
        full_name: notificationData.friend_request.sender.full_name || '',
        username: notificationData.friend_request.sender.username || '',
        profile_picture: notificationData.friend_request.sender.profile_picture || ''
      } : null
    } : null;

    // Create a cleaned notification object that matches the frontend expectations
    await userRef.child(notificationData._id.toString()).set({
      _id: notificationData._id.toString(),
      type: notificationData.type || 'event_created',
      title: notificationData.title || '',
      subtitle: notificationData.subtitle || '',
      message_body: notificationData.message_body || '',
      status: notificationData.status || 'unseen',
      is_seen: notificationData.is_seen || false,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      created_at: notificationData.created_at instanceof Date ? 
        notificationData.created_at.toISOString() : 
        notificationData.created_at || new Date().toISOString(),
      updated_at: notificationData.updated_at instanceof Date ?
        notificationData.updated_at.toISOString() :
        notificationData.updated_at || new Date().toISOString(),
      // Only add if they exist
      ...(event && { event }),
      ...(sender && { sender }),
      ...(friend_request && { friend_request }),
      data: notificationData.data || {},
      count: notificationData.count || 0,
      location: notificationData.location || null
    });
    
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
  } catch (error) {
    console.error('Error marking notification as read in Firebase:', error);
  }
};

/**
 * Remove notification from Firebase (for real-time cleanup)
 * @param {string} userId - User ID
 * @param {string} notificationId - Notification ID to remove
 */
const removeNotificationFromFirebase = async (userId, notificationId) => {
  try {
    const notificationRef = refs.notifications.child(userId).child(notificationId);
    await notificationRef.remove();
  } catch (error) {
    console.error('Error removing notification from Firebase:', error);
  }
};

/**
 * Update friend request status in Firebase
 * @param {string} userId - User ID of the request recipient
 * @param {string} requestId - Request ID
 * @param {string} status - New status (accepted/rejected)
 */
const updateFriendRequestStatus = async (userId, requestId, status) => {
  try {
    const requestRef = refs.friendRequests.child(userId).child(requestId);
    
    if (status === 'accepted' || status === 'rejected') {
      // Remove from pending requests when accepted or rejected
      await requestRef.remove();
    } else {
      // Update status for other cases
      await requestRef.update({ 
        status,
        updated_at: admin.database.ServerValue.TIMESTAMP 
      });
    }
  } catch (error) {
    console.error('Error updating friend request in Firebase:', error);
  }
};

/**
 * Remove friend request from Firebase (for real-time cleanup)
 * @param {string} userId - User ID
 * @param {string} requestId - Friend request ID to remove
 */
const removeFriendRequestFromFirebase = async (userId, requestId) => {
  try {
    const requestRef = refs.friendRequests.child(userId).child(requestId);
    await requestRef.remove();
  } catch (error) {
    console.error('Error removing friend request from Firebase:', error);
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
  removeNotificationFromFirebase,
  updateFriendRequestStatus,
  removeFriendRequestFromFirebase,
  syncAISummary,
  updateUserStatus,
  syncAllNotifications,
  syncFriendRequestStatusUpdate
};