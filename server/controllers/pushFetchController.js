const Notification = require('../database/schemas/notificationsSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const UserPresence = require('../database/schemas/userPresenceSchema');
const APNsToken = require('../database/schemas/apnsTokenSchema');
const User = require('../database/schemas/usersSchema');
const userPresenceService = require('../services/userPresenceService');

/**
 * Register/update APNs device token
 */
const registerDeviceToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    // Deactivate any existing entries for this token (from other users)
    // This handles the case where user switches accounts on same device
    await APNsToken.updateMany(
      { token, userId: { $ne: userId } },
      { isActive: false, updatedAt: new Date() }
    );

    // Deactivate old tokens for this user on other devices
    await APNsToken.updateMany(
      { userId, token: { $ne: token } },
      { isActive: false, updatedAt: new Date() }
    );

    // Create or update the token for this specific user
    // The compound unique index ensures one entry per user-token pair
    
    try {
      const result = await APNsToken.findOneAndUpdate(
        { userId, token },  // Match on BOTH userId and token
        {
          userId,
          token,
          isActive: true,
          lastUsed: new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      res.json({ success: true, message: 'Device token registered' });
    } catch (dbError) {
      console.error(`❌ APNs: Database operation failed:`, dbError);
      res.status(500).json({ error: 'Database operation failed', details: dbError.message });
    }
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
};

/**
 * Fetch notifications data (triggered by push notification)
 */
const fetchNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get recent unread notifications
    const notifications = await Notification.find({ 
      recipient: userId,
      is_seen: false 
    })
    .populate('event', 'title category start_time end_time location')
    .populate('sender', 'full_name username profile_picture')
    .populate('friend_request')
    .sort({ created_at: -1 })
    .limit(50);

    res.json({ 
      success: true, 
      data: notifications,
      count: notifications.length 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/**
 * Fetch friend requests data (triggered by push notification)
 */
const fetchFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get pending friend requests
    const friendRequests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    })
    .populate('sender', 'full_name username profile_picture')
    .sort({ created_at: -1 });

    res.json({ 
      success: true, 
      data: friendRequests,
      count: friendRequests.length 
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
};

/**
 * Fetch user presence data (triggered by push notification)
 */
const fetchPresence = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's friends list
    const user = await User.findById(userId).populate('friends');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle case where user has no friends
    if (!user.friends || user.friends.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        count: 0 
      });
    }

    const friendIds = user.friends.map(friend => friend._id);
    
    // Get presence for all friends
    const friendsPresence = await userPresenceService.getFriendsPresence(friendIds);

    res.json({ 
      success: true, 
      data: friendsPresence,
      count: friendsPresence.length 
    });
  } catch (error) {
    console.error('Error fetching presence data:', error);
    res.status(500).json({ error: 'Failed to fetch presence data' });
  }
};

/**
 * Update user presence (heartbeat endpoint)
 */
const updatePresenceHeartbeat = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's friends for presence notifications
    const user = await User.findById(userId).populate('friends');
    const friendIds = (user && user.friends) ? user.friends.map(friend => friend._id) : [];

    // Update user's online status
    await userPresenceService.updateLastActive(userId, friendIds);

    res.json({ success: true, message: 'Presence updated' });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
};

/**
 * Set user offline
 */
const setUserOffline = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's friends for presence notifications
    const user = await User.findById(userId).populate('friends');
    const friendIds = (user && user.friends) ? user.friends.map(friend => friend._id) : [];

    // Set user offline
    await userPresenceService.setUserOffline(userId, friendIds);

    res.json({ success: true, message: 'User set to offline' });
  } catch (error) {
    console.error('Error setting user offline:', error);
    res.status(500).json({ error: 'Failed to set user offline' });
  }
};

/**
 * Generic data fetch endpoint (for general push notifications)
 */
const fetchData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query;

    let data = {};

    switch (type) {
      case 'notifications':
        data.notifications = await Notification.find({ 
          recipient: userId,
          is_seen: false 
        }).limit(10);
        break;
        
      case 'friend_requests':
        data.friendRequests = await FriendRequest.find({
          receiver: userId,
          status: 'pending'
        }).limit(10);
        break;
        
      default:
        // Return summary data
        data = {
          notificationCount: await Notification.countDocuments({ 
            recipient: userId, 
            is_seen: false 
          }),
          friendRequestCount: await FriendRequest.countDocuments({
            receiver: userId,
            status: 'pending'
          })
        };
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};

/**
 * Invalidate device token on logout
 * This ensures clean token state between user sessions
 */
const invalidateDeviceToken = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Deactivate all active tokens for this user
    const result = await APNsToken.updateMany(
      { userId, isActive: true },
      { 
        isActive: false,
        updatedAt: new Date()
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Device tokens invalidated',
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error invalidating device tokens:', error);
    res.status(500).json({ error: 'Failed to invalidate device tokens' });
  }
};

module.exports = {
  registerDeviceToken,
  fetchNotifications,
  fetchFriendRequests,
  fetchPresence,
  updatePresenceHeartbeat,
  setUserOffline,
  fetchData,
  invalidateDeviceToken
};