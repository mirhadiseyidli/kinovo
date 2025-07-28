const Notification = require('../database/schemas/notificationsSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');
const UserNotificationPreferences = require('../database/schemas/userNotificationPreferencesSchema');
const APNsToken = require('../database/schemas/apnsTokenSchema');
const { sendEmailNotification } = require('../utils/emailNotificationService');
const apnsService = require('../services/apnsService');

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
      .populate({
        path: 'event',
        select: 'title category recurrence start_time end_time attendees',
        populate: {
          path: 'attendees.user',
          select: '_id'
        }
      })
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

    // Process notifications to handle mutual friends and recurring event status
    const processedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const notificationObj = notification.toObject();
        
        // Handle friend request notifications - calculate mutual friends
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
            ...notificationObj,
            data: {
              ...notification.data,
              mutualFriendsCount: mutualFriends.length
            }
          };
        }
        
        // Handle event invitation notifications - check for recurring event responses
        if (notification.type === 'event_invitation' && notification.event) {
          // Check if this is a recurring event and if the user has responded
          if (notification.event.recurrence && notification.event.recurrence.checked) {
            const Events = require('../database/schemas/eventsSchema');
            
            // Case 1: Check for "all_future" responses (user status updated in main event)
            const userAttendeeInMain = notification.event.attendees?.find(
              attendee => {
                // Handle both populated and non-populated user field
                const attendeeUserId = attendee.user?._id || attendee.user;
                return attendeeUserId?.toString() === userId.toString();
              }
            );
            
            if (userAttendeeInMain && userAttendeeInMain.status && userAttendeeInMain.status !== 'pending') {
              // User responded with "all_future" - show status from main event
              return {
                ...notificationObj,
                status: userAttendeeInMain.status
              };
            }
            
            // Case 2: Check for "this_only" responses (separate events created)
            const userSeparateEventResponse = await Events.findOne({
              original_recurring_event_id: notification.event._id,
              'attendees.user': userId,
              'attendees.status': { $in: ['accepted', 'maybe', 'rejected'] }
            }).sort({ start_time: 1 }); // Get the earliest separate event
            
            if (userSeparateEventResponse) {
              // Find the user's status in the separate event
              const userAttendeeInSeparate = userSeparateEventResponse.attendees.find(
                attendee => attendee.user.toString() === userId.toString()
              );
              
              if (userAttendeeInSeparate && userAttendeeInSeparate.status) {
                // User responded with "this_only" - show status from separate event
                return {
                  ...notificationObj,
                  status: userAttendeeInSeparate.status
                };
              }
            }
          }
        }
        
        return notificationObj;
      })
    );

    const totalCount = await Notification.countDocuments({ recipient: userId });
    const unseenCount = await Notification.countDocuments({ 
      recipient: userId, 
      is_seen: false 
    });

    res.status(200).json({
      notifications: processedNotifications,
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
    // Using APNs push-to-fetch system

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

// Create event creation notification for friends (now called new_event_from_friend)
const createEventCreationNotificationForFriends = async (eventId, creatorId, friendIds) => {
  try {
    const creator = await Users.findById(creatorId);
    const event = await require('../database/schemas/eventsSchema').findById(eventId);
    
    if (!creator || !event) {
      throw new Error('Creator or event not found');
    }

    // Create notifications for all friends (regardless of event visibility)
    const notifications = await Promise.all(
      friendIds.map(async (friendId) => {
        // Check if friend wants to receive new event from friend notifications
        const shouldReceiveInApp = await shouldReceiveNotification(friendId, 'new_event_from_friend', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(friendId, 'new_event_from_friend', 'email');
        const shouldReceivePush = await shouldReceiveNotification(friendId, 'new_event_from_friend', 'push');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
          return null;
        }

        const friend = await Users.findById(friendId);
        if (!friend) {
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
            recipient: friendId,
            sender: creatorId,
            event: eventId,
            type: 'new_event_from_friend',
            title: 'New Event from Friend',
            subtitle: `${creator.full_name} created "${event.title}"`,
            data: {
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              eventVisibility: event.visibility,
              creatorName: creator.full_name
            }
          });
        }

        // Send push notification if enabled
        if (shouldReceivePush) {
          sendPushNotification([friendId], 'new_event_from_friend', {
            eventTitle: event.title,
            eventId: eventId,
            creatorName: creator.full_name
          }).catch(error => {
            console.error('Push notification failed for new event from friend:', error);
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && friend.email) {
          await sendEmailNotification(friend.email, 'new_event_from_friend', {
            creatorName: creator.full_name,
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
    console.error('Error creating new event from friend notifications:', error);
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
          const shouldReceivePush = await shouldReceiveNotification(attendeeId, 'event_updated', 'push');
          
          if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
            return null;
          }

          const attendee = await Users.findById(attendeeId);
          if (!attendee) {
            return null;
          }

          let notification = null;

          // Create in-app notification if enabled
          if (shouldReceiveInApp) {
            const isCancellation = event.status === 'cancelled';
            notification = await createNotification({
              recipient: attendeeId,
              sender: updaterId,
              event: eventId,
              type: 'event_updated',
              title: isCancellation ? 'Event Cancelled' : 'Event Updated',
              subtitle: isCancellation 
                ? `${updater.full_name} cancelled "${event.title}"`
                : `${updater.full_name} updated "${event.title}"`,
              data: {
                eventTitle: event.title,
                eventLocation: event.location?.text || event.location?.city,
                eventStartTime: event.start_time,
                updatedBy: updater.full_name,
                isCancellation: isCancellation
              }
            });
          }

          // Send push notification if enabled
          if (shouldReceivePush) {
            sendPushNotification([attendeeId], 'event_updated', {
              eventTitle: event.title,
              eventId: eventId,
              isCancellation: event.status === 'cancelled'
            }).catch(error => {
              console.error('Push notification failed for event update:', error);
            });
          }

          // Send email notification if enabled
          if (shouldReceiveEmail && attendee.email) {
            await sendEmailNotification(attendee.email, 'event_updated', {
              updaterName: updater.full_name,
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              isCancellation: event.status === 'cancelled'
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

    // Don't notify if the event creator confirms their own attendance
    if (event.creator.toString() === attendeeId.toString()) {
      return null;
    }

    // Check if event creator wants to receive attendance notifications
    const shouldReceiveInApp = await shouldReceiveNotification(event.creator, 'event_attendance_confirmed', 'inApp');
    const shouldReceiveEmail = await shouldReceiveNotification(event.creator, 'event_attendance_confirmed', 'email');
    const shouldReceivePush = await shouldReceiveNotification(event.creator, 'event_attendance_confirmed', 'push');
    
    if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
      return null;
    }

    const creator = await Users.findById(event.creator);
    if (!creator) {
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

    // Send push notification if enabled
    if (shouldReceivePush) {
      sendPushNotification([event.creator], 'event_attendance_confirmed', {
        eventTitle: event.title,
        eventId: eventId,
        attendeeName: attendee.full_name
      }).catch(error => {
        console.error('Push notification failed for event attendance:', error);
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

// Create event invitation notification
const createEventInvitationNotification = async (eventId, inviteeIds) => {
  try {
    const event = await require('../database/schemas/eventsSchema')
      .findById(eventId)
      .populate('creator', 'full_name');
    
    if (!event) {
      throw new Error('Event not found');
    }

    // Create invitation notifications for all invitees
    const notifications = await Promise.all(
      inviteeIds.map(async (inviteeId) => {
        // Check if invitee wants to receive event invitation notifications
        const shouldReceiveInApp = await shouldReceiveNotification(inviteeId, 'event_invitation', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(inviteeId, 'event_invitation', 'email');
        const shouldReceivePush = await shouldReceiveNotification(inviteeId, 'event_invitation', 'push');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
          return null;
        }

        const invitee = await Users.findById(inviteeId);
        if (!invitee) {
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
            recipient: inviteeId,
            sender: event.creator._id,
            event: eventId,
            type: 'event_invitation',
            title: 'Event Invitation',
            subtitle: `${event.creator.full_name} invited you to "${event.title}"`,
            status: 'pending',
            data: {
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              invitedBy: event.creator.full_name
            }
          });
        }

        // Send push notification if enabled
        if (shouldReceivePush) {
          sendPushNotification([inviteeId], 'event_invitation', {
            eventTitle: event.title,
            eventId: eventId,
            inviterName: event.creator.full_name
          }).catch(error => {
            console.error('Push notification failed for event invitation:', error);
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && invitee.email) {
          await sendEmailNotification(invitee.email, 'event_invitation', {
            eventTitle: event.title,
            eventLocation: event.location?.text || event.location?.city,
            eventStartTime: event.start_time,
            invitedBy: event.creator.full_name
          });
        }

        return notification;
      })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating event invitation notifications:', error);
    throw error;
  }
};

// Create event reminder notification (10 minutes or 1 hour before)
const createEventReminderNotification = async (eventId, reminderType = 'event_reminder_1_hour', specificUserId = null) => {
  try {
    const event = await require('../database/schemas/eventsSchema')
      .findById(eventId)
      .populate('attendees.user', 'full_name')
      .populate('creator', 'full_name');
    
    if (!event) {
      throw new Error('Event not found');
    }

    // If specificUserId is provided, only send to that user
    let targetAttendees;
    if (specificUserId) {
      const userAttendee = event.attendees.find(att => 
        att.user._id.toString() === specificUserId.toString() && 
        (att.status === 'accepted' || att.status === 'maybe')
      );
      targetAttendees = userAttendee ? [userAttendee.user] : [];
    } else {
      // Backward compatibility - get all accepted/maybe attendees
      targetAttendees = event.attendees
        .filter(attendee => attendee.status === 'accepted' || attendee.status === 'maybe')
        .map(attendee => attendee.user);
    }

    // Create reminder notifications for target attendees (respecting their preferences)
    const notifications = await Promise.all(
      targetAttendees.map(async (attendee) => {
        // Check if attendee wants to receive event reminder notifications
        const shouldReceiveInApp = await shouldReceiveNotification(attendee._id, reminderType, 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(attendee._id, reminderType, 'email');
        const shouldReceivePush = await shouldReceiveNotification(attendee._id, reminderType, 'push');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
          return null;
        }

        const attendeeUser = await Users.findById(attendee._id);
        if (!attendeeUser) {
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          const timeText = reminderType === 'event_reminder_10_mins' ? '10 minutes' : '1 hour';
          notification = await createNotification({
            recipient: attendee._id,
            sender: event.creator._id,
            event: eventId,
            type: reminderType,
            title: 'Event Reminder',
            subtitle: `"${event.title}" starts in ${timeText}`,
            data: {
              eventTitle: event.title,
              eventLocation: event.location?.text || event.location?.city,
              eventStartTime: event.start_time,
              reminderType: reminderType === 'event_reminder_10_mins' ? '10_mins_before' : '1_hour_before'
            }
          });
        }

        // Send push notification if enabled
        if (shouldReceivePush) {
          console.log('Sending push notification for event reminder');
          await sendPushNotification([attendee._id], reminderType, {
            eventTitle: event.title,
            eventId: eventId
          }).then(response => {
            console.log('Push notification sent:', response);
          })
          .catch(error => {
            console.error('Push notification failed for event reminder:', error);
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && attendeeUser.email) {
          console.log('Sending email notification for event reminder');
          await sendEmailNotification(attendeeUser.email, reminderType, {
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
        const shouldReceivePush = await shouldReceiveNotification(userId, 'new_event_nearby', 'push');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
          return null;
        }

        const user = await Users.findById(userId);
        if (!user) {
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

        // Send push notification if enabled
        if (shouldReceivePush) {
          sendPushNotification([userId], 'new_event_nearby', {
            eventTitle: event.title,
            eventId: eventId
          }).catch(error => {
            console.error('Push notification failed for nearby event:', error);
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

// Create someone from contacts joined notification
const createContactJoinedNotification = async (newUserId, contactOwnerIds) => {
  try {
    const newUser = await Users.findById(newUserId);
    if (!newUser) {
      throw new Error('New user not found');
    }

    // Create notifications for all users who have this contact
    const notifications = await Promise.all(
      contactOwnerIds.map(async (contactOwnerId) => {
        // Check if contact owner wants to receive contact joined notifications
        const shouldReceiveInApp = await shouldReceiveNotification(contactOwnerId, 'someone_from_contacts_joined', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(contactOwnerId, 'someone_from_contacts_joined', 'email');
        const shouldReceivePush = await shouldReceiveNotification(contactOwnerId, 'someone_from_contacts_joined', 'push');
        
        if (!shouldReceiveInApp && !shouldReceiveEmail && !shouldReceivePush) {
          return null;
        }

        const contactOwner = await Users.findById(contactOwnerId);
        if (!contactOwner) {
          return null;
        }

        let notification = null;

        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          notification = await createNotification({
            recipient: contactOwnerId,
            sender: newUserId,
            type: 'someone_from_contacts_joined',
            title: 'Contact Joined Kinovo',
            subtitle: `${newUser.full_name} from your contacts just joined Kinovo`,
            data: {
              contactName: newUser.full_name,
              contactUsername: newUser.username,
              contactId: newUserId
            }
          });
        }

        // Send push notification if enabled
        if (shouldReceivePush) {
          sendPushNotification([contactOwnerId], 'someone_from_contacts_joined', {
            contactName: newUser.full_name,
            userId: newUserId
          }).catch(error => {
            console.error('Push notification failed for contact joined:', error);
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && contactOwner.email) {
          await sendEmailNotification(contactOwner.email, 'someone_from_contacts_joined', {
            contactName: newUser.full_name,
            contactUsername: newUser.username
          });
        }

        return notification;
      })
    );

    return notifications.filter(notification => notification !== null);
  } catch (error) {
    console.error('Error creating contact joined notifications:', error);
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
    
    // APNs push notifications will be sent automatically
    
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
    
    // APNs push notifications will be sent automatically
    
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
            friend_request_accepted: true,
            event_reminder_10_mins: true,
            event_reminder_1_hour: true,
            event_updated: true,
            new_event_nearby: true,
            event_attendance_confirmed: true,
            new_event_from_friend: true,
            event_invitation: true,
            someone_from_contacts_joined: true
          },
          email: {
            friend_request_accepted: false,
            event_reminder_10_mins: false,
            event_reminder_1_hour: false,
            event_updated: false,
            new_event_nearby: false,
            event_attendance_confirmed: false,
            new_event_from_friend: false,
            event_invitation: false,
            someone_from_contacts_joined: false
          },
          push: {
            friend_request_accepted: true,
            event_reminder_10_mins: true,
            event_reminder_1_hour: true,
            event_updated: true,
            new_event_nearby: true,
            event_attendance_confirmed: true,
            new_event_from_friend: true,
            event_invitation: true,
            someone_from_contacts_joined: true
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

// APNs Token Management Functions

// Save/update APNs token for user
const saveAPNsToken = async (req, res) => {
  try {
    const { token, platform, userId } = req.body;
    console.log('📱 APNs: Received token save request', { 
      userId, 
      platform, 
      tokenStart: token ? token.substring(0, 20) + '...' : 'none' 
    });
    
    if (!token || !platform || !userId) {
      console.log('❌ APNs: Missing required fields', { token: !!token, platform: !!platform, userId: !!userId });
      return res.status(400).json({ 
        success: false, 
        message: 'Token, platform, and userId are required' 
      });
    }

    // Check if token already exists
    const existingToken = await APNsToken.findOne({ token });
    console.log('📱 APNs: Existing token found:', !!existingToken);
    
    if (existingToken) {
      // Update existing token
      existingToken.userId = userId;
      existingToken.platform = platform;
      existingToken.isActive = true;
      existingToken.lastUsed = new Date();
      await existingToken.save();
      console.log('✅ APNs: Updated existing token');
    } else {
      // Create new token
      const newToken = await APNsToken.create({
        userId,
        token,
        platform,
        isActive: true
      });
      console.log('✅ APNs: Created new token', newToken._id);
    }

    // Deactivate old tokens for this user on the same platform
    const updateResult = await APNsToken.updateMany(
      { 
        userId, 
        platform, 
        token: { $ne: token },
        isActive: true 
      },
      { isActive: false }
    );
    console.log('📱 APNs: Deactivated old tokens:', updateResult.modifiedCount);

    res.json({ success: true, message: 'APNs token saved successfully' });
  } catch (error) {
    console.error('Error saving APNs token:', error);
    res.status(500).json({ success: false, message: 'Failed to save APNs token' });
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

    if (usersWhoWantPush.length === 0) {
      return { success: true, message: 'No users want push notifications' };
    }

    // Get active APNs tokens for these users
    const apnsTokenDocs = await APNsToken.findActiveTokensByUserIds(usersWhoWantPush);
    const tokens = apnsTokenDocs.map(doc => doc.token);
    
    if (tokens.length === 0) {
      return { success: false, message: 'No active APNs tokens found' };
    }

    // Send the notification
    const result = await apnsService.sendNotificationByType(tokens, notificationType, payload);
    
    // Handle invalid tokens
    if (result.invalidTokens && result.invalidTokens.length > 0) {
      await Promise.all(
        result.invalidTokens.map(token => APNsToken.deactivateToken(token))
      );
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
  } catch (error) {
    console.error('Error sending event invitation push notification:', error);
  }
};

// Send test notification
const sendTestNotification = async (req, res) => {
  console.log('sendTestNotification', req.body);
  try {
    const { token, type, payload } = req.body;

    if (!token || !type || !payload) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token, type, and payload are required' 
      });
    }

    // Send the notification using APNs service
    console.log('sending to single token', token);
    const result = await fcmService.sendNotificationByType(token, type, payload);

    if (result.success) {
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send test notification',
        error: result.error 
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

module.exports = {
  createNotification,
  createFriendRequestNotification,
  updateFriendRequestNotificationStatus,
  getUserNotifications,
  markNotificationsAsSeen,
  getUnseenNotificationsCount,
  createEventUpdateNotification,
  createEventAttendanceNotification,
  createEventInvitationNotification,
  createEventReminderNotification,
  createNearbyEventNotification,
  createEventCreationNotificationForFriends,
  createContactJoinedNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  shouldReceiveNotification,
  // APNs functions
  saveAPNsToken,
  sendPushNotification,
  sendFriendRequestPushNotification,
  sendEventInvitationPushNotification,
  sendTestNotification
}; 