const Notification = require('../database/schemas/notificationsSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');
const UserNotificationPreferences = require('../database/schemas/userNotificationPreferencesSchema');
const FCMToken = require('../database/schemas/fcmTokenSchema');
const { sendEmailNotification } = require('../utils/emailNotificationService');
const fcmService = require('../services/fcmService');

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
    // Check if recipient wants to receive friend request notifications
    const shouldReceiveInApp = await shouldReceiveNotification(recipientId, 'friend_request', 'inApp');
    const shouldReceiveEmail = await shouldReceiveNotification(recipientId, 'friend_request', 'email');
    const shouldReceivePush = await shouldReceiveNotification(recipientId, 'friend_request', 'push');
    
    if (!shouldReceiveInApp && !shouldReceiveEmail) {
      console.log(`User ${recipientId} has disabled all friend request notifications`);
      return null;
    }

    const sender = await Users.findById(senderId);
    const recipient = await Users.findById(recipientId);
    
    if (!sender || !recipient) {
      throw new Error('Sender or recipient not found');
    }

    // // Calculate mutual friends
    const recipientFriends = recipient.friends || [];
    const senderFriends = sender.friends || [];
    const mutualFriendsCount = recipientFriends.filter(recipientFriendId => 
      senderFriends.some(senderFriendId => 
        recipientFriendId.toString() === senderFriendId.toString()
      )
    ).length;

    let notification = null;

    // // Create in-app notification if enabled
    // if (shouldReceiveInApp) {
    //   notification = await createNotification({
    //     recipient: recipientId,
    //     sender: senderId,
    //     friend_request: friendRequestId,
    //     type: 'friend_request',
    //     title: 'New Friend Request',
    //     subtitle: `${sender.full_name} sent you a friend request`,
    //     status: 'pending',
    //     data: {
    //       mutualFriendsCount: mutualFriendsCount
    //     }
    //   });
    // }

    // Send email notification if enabled
    if (shouldReceiveEmail && recipient.email) {
      await sendEmailNotification(recipient.email, 'friend_request', {
        senderName: sender.full_name,
        senderUsername: sender.username,
        mutualFriendsCount: mutualFriendsCount
      });
    }

    // Send push notification if enabled
    if (shouldReceivePush) {
      // Fire and forget - don't wait for push notification
      sendFriendRequestPushNotification(senderId, recipientId).catch(error => {
        console.error('Push notification failed for friend request:', error);
      });
    }

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
    const { removeNotificationFromFirebase } = require('../services/realtimeSyncService');

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

      // Clean up seen notifications from Firebase (they're no longer needed for real-time)
      const cleanupPromises = notificationIds.map(id => 
        removeNotificationFromFirebase(userId.toString(), id)
      );
      await Promise.all(cleanupPromises);
    } else {
      // Mark all notifications as seen
      result = await Notification.updateMany(
        { recipient: userId },
        { 
          is_seen: true,
          updated_at: new Date()
        }
      );

      // Clean up all notifications from Firebase for this user
      try {
        const { admin, db } = require('../config/firebase-admin');
        const userNotificationsRef = db.ref(`notifications/${userId}`);
        await userNotificationsRef.remove();
        console.log(`All notifications cleaned up from Firebase for user ${userId}`);
      } catch (firebaseError) {
        console.error('Error cleaning up all notifications from Firebase:', firebaseError);
      }
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

    // Create notifications for all friends (respecting their preferences)
    const notifications = await Promise.all(
      friendIds.map(async (friendId) => {
        // Check if friend wants to receive event creation notifications
        const shouldReceiveInApp = await shouldReceiveNotification(friendId, 'event_created', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(friendId, 'event_created', 'email');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail) {
          console.log(`User ${friendId} has disabled all event creation notifications`);
          return null;
        }

        const friend = await Users.findById(friendId);
        if (!friend) {
          console.log(`Friend ${friendId} not found`);
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
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
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && friend.email) {
          await sendEmailNotification(friend.email, 'event_created', {
            creatorName: creator.full_name,
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time
          });
        }

        // Send push notification if enabled
        const shouldReceivePush = await shouldReceiveNotification(friendId, 'event_created', 'push');
        if (shouldReceivePush) {
          sendPushNotification([friendId], 'event_invitation', {
            eventTitle: event.title,
            eventId: eventId
          }).catch(error => {
            console.error('Push notification failed for event creation:', error);
          });
        }

        // Note: Real-time notification will be sent automatically by the change stream
        return notification;
      })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating event creation notifications:', error);
    throw error;
  }
};

// Create event update notification for attendees
const createEventUpdateNotification = async (eventId, updaterId, attendeeIds) => {
  try {
    const updater = await Users.findById(updaterId);
    const event = await require('../database/schemas/eventsSchema').findById(eventId);
    
    if (!updater || !event) {
      throw new Error('Updater or event not found');
    }

    // Create notifications for all attendees except the updater (respecting their preferences)
    const notifications = await Promise.all(
      attendeeIds
        .filter(attendeeId => attendeeId.toString() !== updaterId.toString())
        .map(async (attendeeId) => {
          // Check if attendee wants to receive event update notifications
          const shouldReceiveInApp = await shouldReceiveNotification(attendeeId, 'event_updated', 'inApp');
          const shouldReceiveEmail = await shouldReceiveNotification(attendeeId, 'event_updated', 'email');
          
          if (!shouldReceiveInApp && !shouldReceiveEmail) {
            console.log(`User ${attendeeId} has disabled all event update notifications`);
            return null;
          }

          const attendee = await Users.findById(attendeeId);
          if (!attendee) {
            console.log(`Attendee ${attendeeId} not found`);
            return null;
          }

          let notification = null;

          // Create in-app notification if enabled
          if (shouldReceiveInApp) {
            notification = await createNotification({
              recipient: attendeeId,
              sender: updaterId,
              event: eventId,
              type: 'event_updated',
              title: 'Event Updated',
              subtitle: `${updater.full_name} updated "${event.title}"`,
              data: {
                eventTitle: event.title,
                eventLocation: event.location?.text || event.location?.city,
                eventStartTime: event.start_time,
                updatedBy: updater.full_name
              }
            });
          }

          // Send email notification if enabled
          if (shouldReceiveEmail && attendee.email) {
            await sendEmailNotification(attendee.email, 'event_updated', {
              updaterName: updater.full_name,
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time
            });
          }

          return notification;
        })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating event update notifications:', error);
    throw error;
  }
};

// Create event attendance confirmation notification for host
const createEventAttendanceNotification = async (eventId, attendeeId, status) => {
  try {
    if (status !== 'accepted') {
      return null; // Only notify on acceptance
    }

    const attendee = await Users.findById(attendeeId);
    const event = await require('../database/schemas/eventsSchema').findById(eventId);
    
    if (!attendee || !event) {
      throw new Error('Attendee or event not found');
    }

    // Check if event creator wants to receive attendance notifications
    const shouldReceiveInApp = await shouldReceiveNotification(event.creator, 'event_attendance_confirmed', 'inApp');
    const shouldReceiveEmail = await shouldReceiveNotification(event.creator, 'event_attendance_confirmed', 'email');
    
    if (!shouldReceiveInApp && !shouldReceiveEmail) {
      console.log(`User ${event.creator} has disabled all event attendance notifications`);
      return null;
    }

    const creator = await Users.findById(event.creator);
    if (!creator) {
      console.log(`Event creator ${event.creator} not found`);
      return null;
    }

    let notification = null;

    // Create in-app notification if enabled
    if (shouldReceiveInApp) {
      notification = await createNotification({
        recipient: event.creator,
        sender: attendeeId,
        event: eventId,
        type: 'event_attendance_confirmed',
        title: 'Event Attendance Confirmed',
        subtitle: `${attendee.full_name} is attending "${event.title}"`,
        data: {
          eventTitle: event.title,
          eventStartTime: event.start_time,
          attendeeName: attendee.full_name,
          status: status
        }
      });
    }

    // Send email notification if enabled
    if (shouldReceiveEmail && creator.email) {
      await sendEmailNotification(creator.email, 'event_attendance_confirmed', {
        attendeeName: attendee.full_name,
        eventTitle: event.title,
        eventStartTime: event.start_time
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating event attendance notification:', error);
    throw error;
  }
};

// Create event reminder notification (1 hour before)
const createEventReminderNotification = async (eventId) => {
  try {
    const event = await require('../database/schemas/eventsSchema')
      .findById(eventId)
      .populate('attendees.user', 'full_name')
      .populate('creator', 'full_name');
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Get all accepted attendees
    const acceptedAttendees = event.attendees
      .filter(attendee => attendee.status === 'accepted')
      .map(attendee => attendee.user);

    // Create reminder notifications for all accepted attendees (respecting their preferences)
    const notifications = await Promise.all(
      acceptedAttendees.map(async (attendee) => {
        // Check if attendee wants to receive event reminder notifications
        const shouldReceiveInApp = await shouldReceiveNotification(attendee._id, 'event_reminder', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(attendee._id, 'event_reminder', 'email');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail) {
          console.log(`User ${attendee._id} has disabled all event reminder notifications`);
          return null;
        }

        const attendeeUser = await Users.findById(attendee._id);
        if (!attendeeUser) {
          console.log(`Attendee user ${attendee._id} not found`);
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
            recipient: attendee._id,
            sender: event.creator._id,
            event: eventId,
            type: 'event_reminder',
            title: 'Event Reminder',
            subtitle: `"${event.title}" starts in 1 hour`,
            data: {
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              reminderType: '1_hour_before'
            }
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && attendeeUser.email) {
          await sendEmailNotification(attendeeUser.email, 'event_reminder', {
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time
          });
        }

        return notification;
      })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating event reminder notifications:', error);
    throw error;
  }
};

// Create nearby event notification (for users within 50 miles)
const createNearbyEventNotification = async (eventId, userIds) => {
  try {
    const event = await require('../database/schemas/eventsSchema')
      .findById(eventId)
      .populate('creator', 'full_name');
    
    if (!event || event.visibility !== 'public') {
      return []; // Only notify for public events
    }

    // Create notifications for nearby users
    const notifications = await Promise.all(
      userIds.map(async (userId) => {
        // Don't notify the event creator or existing attendees
        if (userId.toString() === event.creator._id.toString()) {
          return null;
        }

        const isAttendee = event.attendees.some(
          attendee => attendee.user.toString() === userId.toString()
        );

        if (isAttendee) {
          return null;
        }

        // Check if user wants to receive nearby event notifications
        const shouldReceiveInApp = await shouldReceiveNotification(userId, 'new_event_nearby', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(userId, 'new_event_nearby', 'email');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail) {
          console.log(`User ${userId} has disabled all nearby event notifications`);
          return null;
        }

        const user = await Users.findById(userId);
        if (!user) {
          console.log(`User ${userId} not found`);
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
            recipient: userId,
            sender: event.creator._id,
            event: eventId,
            type: 'new_event_nearby',
            title: 'New Event Nearby',
            subtitle: `"${event.title}" is happening near you`,
            data: {
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              eventCategory: event.category,
              creatorName: event.creator.full_name,
              distance: null // Will be calculated separately
            }
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && user.email) {
          await sendEmailNotification(user.email, 'new_event_nearby', {
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time,
            distance: 0 // Default distance, will be calculated by cron job
          });
        }

        return notification;
      })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating nearby event notifications:', error);
    throw error;
  }
};

// Update event creation notification to only notify for public events
const createEventCreationNotificationForFriends = async (eventId, creatorId, friendIds) => {
  try {
    const creator = await Users.findById(creatorId);
    const event = await require('../database/schemas/eventsSchema').findById(eventId);
    
    if (!creator || !event) {
      throw new Error('Creator or event not found');
    }

    // Only notify friends for public events
    if (event.visibility !== 'public') {
      return [];
    }

    // Create notifications for all friends
    const notifications = await Promise.all(
      friendIds.map(async (friendId) => {
        const notification = await createNotification({
          recipient: friendId,
          sender: creatorId,
          event: eventId,
          type: 'event_created',
          title: 'New Public Event',
          subtitle: `${creator.full_name} created "${event.title}"`,
          data: {
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time,
            eventVisibility: event.visibility
          }
        });

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

// Get user notification preferences
const getUserNotificationPreferences = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    
    let preferences = await UserNotificationPreferences.findOne({ user: userId });
    
    if (!preferences) {
      // Create default preferences if they don't exist
      preferences = new UserNotificationPreferences({ 
        user: userId,
        preferences: {
          inApp: {
            friend_request: true,
            friend_request_accepted: true,
            event_created: true,
            event_attendance_confirmed: true,
            new_event_nearby: true,
            event_reminder: true,
            event_updated: true
          },
          email: {
            friend_request: false,
            friend_request_accepted: false,
            event_created: false,
            event_attendance_confirmed: false,
            new_event_nearby: false,
            event_reminder: true,
            event_updated: false
          },
          push: {
            friend_request: true,
            friend_request_accepted: true,
            event_created: true,
            event_attendance_confirmed: true,
            new_event_nearby: true,
            event_reminder: true,
            event_updated: true
          }
        }
      });
      await preferences.save();
    }
    
    res.json({
      success: true,
      preferences: preferences.preferences
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences'
    });
  }
};

// Update user notification preferences
const updateUserNotificationPreferences = async (req, res) => {
  console.log('updateUserNotificationPreferences', req.body);
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences data is required'
      });
    }
    
    let userPreferences = await UserNotificationPreferences.findOne({ user: userId });
    
    if (!userPreferences) {
      // Create new preferences
      userPreferences = new UserNotificationPreferences({
        user: userId,
        preferences
      });
    } else {
      // Update existing preferences
      userPreferences.preferences = preferences;
    }
    
    await userPreferences.save();
    
    res.json({
      success: true,
      preferences: userPreferences.preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
};

// Check if user should receive a specific type of notification
const shouldReceiveNotification = async (userId, notificationType, channel = 'inApp') => {
  try {
    const preferences = await UserNotificationPreferences.findOne({ user: userId });
    
    if (!preferences) {
      // Return default behavior if no preferences found
      return true;
    }
    
    const channelPrefs = preferences.preferences[channel];
    if (!channelPrefs) {
      return true;
    }
    
    return channelPrefs[notificationType] !== false;
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // Return true on error to ensure notifications aren't blocked by technical issues
    return true;
  }
};

// FCM Token Management Functions

// Save/update FCM token for user
const saveFCMToken = async (req, res) => {
  try {
    const { token, platform, userId } = req.body;
    
    if (!token || !platform || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token, platform, and userId are required' 
      });
    }

    // Check if token already exists
    const existingToken = await FCMToken.findOne({ token });
    
    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.platform = platform;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();
      await existingToken.save();
    } else {
      // Create new token
      await FCMToken.create({
        userId,
        token,
        platform,
        isActive: true
      });
    }

    // Deactivate old tokens for this user on the same platform
    await FCMToken.updateMany(
      { 
        userId, 
        platform, 
        token: { $ne: token },
        isActive: true 
      },
      { isActive: false }
    );

    res.json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ success: false, message: 'Failed to save FCM token' });
  }
};

// Send push notification to user(s)
const sendPushNotification = async (userIds, notificationType, payload) => {
  try {
    // Check if users want to receive push notifications for this type
    const usersWhoWantPush = [];
    for (const userId of userIds) {
      const shouldReceive = await shouldReceiveNotification(userId, notificationType, 'push');
      if (shouldReceive) {
        usersWhoWantPush.push(userId);
      }
    }
    console.log('usersWhoWantPush', usersWhoWantPush);

    if (usersWhoWantPush.length === 0) {
      console.log('No users want to receive push notifications for type:', notificationType);
      return { success: true, message: 'No users want push notifications' };
    }

    // Get active FCM tokens for these users
    const fcmTokenDocs = await FCMToken.findActiveTokensByUserIds(usersWhoWantPush);
    const tokens = fcmTokenDocs.map(doc => doc.token);
    
    if (tokens.length === 0) {
      console.log('No active FCM tokens found for users:', usersWhoWantPush);
      return { success: false, message: 'No active FCM tokens found' };
    }

    // Send the notification
    const result = await fcmService.sendNotificationByType(tokens, notificationType, payload);
    
    // Handle invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await Promise.all(
        result.invalidTokens.map(token => FCMToken.deactivateToken(token))
      );
      console.log(`Deactivated ${result.invalidTokens.length} invalid FCM tokens`);
    }

    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

// Send push notifications for friend requests  
const sendFriendRequestPushNotification = async (senderId, recipientId) => {
  try {
    const sender = await Users.findById(senderId).select('full_name');
    if (!sender) return;

    const result = await sendPushNotification([recipientId], 'friend_request', {
      senderName: sender.full_name,
      senderId: senderId
    });

    console.log('Friend request push notification result:', result);
  } catch (error) {
    console.error('Error sending friend request push notification:', error);
  }
};

// Send push notifications for event invitations
const sendEventInvitationPushNotification = async (eventId, inviteeIds) => {
  try {
    const Event = require('../database/schemas/eventsSchema');
    const event = await Event.findById(eventId).select('title');
    if (!event) return;

    const result = await sendPushNotification(inviteeIds, 'event_invitation', {
      eventTitle: event.title,
      eventId: eventId
    });

    console.log('Event invitation push notification result:', result);
  } catch (error) {
    console.error('Error sending event invitation push notification:', error);
  }
};

module.exports = {
  createNotification,
  createFriendRequestNotification,
  updateFriendRequestNotificationStatus,
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount,
  createEventCreationNotification,
  createEventUpdateNotification,
  createEventAttendanceNotification,
  createEventReminderNotification,
  createNearbyEventNotification,
  createEventCreationNotificationForFriends,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  shouldReceiveNotification,
  // FCM functions
  saveFCMToken,
  sendPushNotification,
  sendFriendRequestPushNotification,
  sendEventInvitationPushNotification
}; 