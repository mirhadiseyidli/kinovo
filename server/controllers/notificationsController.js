const Notification = require('../database/schemas/notificationsSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');

// Create a new notification
const createNotification = async (notificationData) => {
  try {
  
    const notification = new Notification(notificationData);
    await notification.save();

    
    // Populate the notification with sender and other references
    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'full_name username profile_picture')
      .populate('event', 'title category')
      .populate('friend_request');
    

    return populatedNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create friend request notification
const createFriendRequestNotification = async (friendRequestId, senderId, recipientId) => {
  try {
    const sender = await Users.findById(senderId);
    const notification = await createNotification({
      recipient: recipientId,
      sender: senderId,
      friend_request: friendRequestId,
      type: 'friend_request',
      title: 'New Friend Request',
      subtitle: `${sender.full_name} sent you a friend request`,
      status: 'pending',
      data: {
        mutualFriendsCount: 0 // Will be calculated separately
      }
    });

    return notification;
  } catch (error) {
    console.error('Error creating friend request notification:', error);
    throw error;
  }
};

// Update friend request notification status
const updateFriendRequestNotificationStatus = async (friendRequestId, status) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { friend_request: friendRequestId, type: 'friend_request' },
      { 
        status: status,
        updated_at: new Date()
      },
      { new: true }
    ).populate('sender', 'full_name username profile_picture')
     .populate('recipient', 'full_name username');

    return notification;
  } catch (error) {
    console.error('Error updating friend request notification:', error);
    throw error;
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'full_name username profile_picture')
      .populate('event', 'title category')
      .populate({
        path: 'friend_request',
        populate: {
          path: 'sender',
          select: 'full_name username profile_picture'
        }
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate mutual friends for friend request notifications
    const notificationsWithMutualFriends = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.type === 'friend_request' && notification.friend_request) {
          const recipient = await Users.findById(userId).select('friends');
          const sender = await Users.findById(notification.sender._id).select('friends');
          
          const recipientFriends = recipient?.friends || [];
          const senderFriends = sender?.friends || [];
          
          const mutualFriends = recipientFriends.filter(recipientFriendId => 
            senderFriends.some(senderFriendId => 
              recipientFriendId.toString() === senderFriendId.toString()
            )
          );
          
          return {
            ...notification.toObject(),
            data: {
              ...notification.data,
              mutualFriendsCount: mutualFriends.length
            }
          };
        }
        return notification.toObject();
      })
    );

    const totalCount = await Notification.countDocuments({ recipient: userId });
    const unseenCount = await Notification.countDocuments({ 
      recipient: userId, 
      is_seen: false 
    });

    res.status(200).json({
      notifications: notificationsWithMutualFriends,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      unseenCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark notifications as seen
const markNotificationsAsSeen = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const { notificationIds } = req.body;

    let result;
    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as seen
    
      result = await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          recipient: userId 
        },
        { 
          is_seen: true,
          updated_at: new Date()
        }
      );
    } else {
      // Mark all notifications as seen

      result = await Notification.updateMany(
        { recipient: userId },
        { 
          is_seen: true,
          updated_at: new Date()
        }
      );
    }


    res.status(200).json({ message: 'Notifications marked as seen' });
  } catch (error) {
    console.error('Error marking notifications as seen:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get unseen notifications count
const getUnseenNotificationsCount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const count = await Notification.countDocuments({ 
      recipient: userId, 
      is_seen: false 
    });

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create event creation notification for friends
const createEventCreationNotification = async (eventId, creatorId, friendIds) => {
  try {
    const creator = await Users.findById(creatorId);
    const event = await require('../database/schemas/eventsSchema').findById(eventId);
    
    if (!creator || !event) {
      throw new Error('Creator or event not found');
    }

    // Create notifications for all friends
    const notifications = await Promise.all(
      friendIds.map(async (friendId) => {
        const notification = await createNotification({
          recipient: friendId,
          sender: creatorId,
          event: eventId,
          type: 'event_created',
          title: 'New Event Created',
          subtitle: `${creator.full_name} created "${event.title}"`,
          data: {
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time,
            eventVisibility: event.visibility
          }
        });

        // Note: Real-time notification will be sent automatically by the change stream
        return notification;
      })
    );

    return notifications;
  } catch (error) {
    console.error('Error creating event creation notifications:', error);
    throw error;
  }
};

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, type, message, relatedId } = req.body;
    
    // Create in MongoDB
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      related_id: relatedId,
      read: false,
    });
    
    // Sync to Firebase happens automatically via change stream
    
    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Update in MongoDB
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Sync to Firebase happens automatically via change stream
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createNotification,
  createFriendRequestNotification,
  updateFriendRequestNotificationStatus,
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount,
  createEventCreationNotification
}; 