const mongoose = require('mongoose');
const User = require('../database/schemas/usersSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Notification = require('../database/schemas/notificationsSchema');
const Event = require('../database/schemas/eventsSchema');
const { 
  syncFriendRequest, 
  updateFriendRequestStatus, 
  syncNotification,
  syncFriendEventActivities,
  removeFriendRequestFromFirebase
} = require('./realtimeSyncService');

// Initialize all change streams
const initializeChangeStreams = () => {
  
  // Friend Request change stream
  const friendRequestStream = FriendRequest.watch();
  friendRequestStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert') {
        const newRequest = change.fullDocument;
        
        // Populate the sender data for Firebase
        const populatedRequest = await FriendRequest.findById(newRequest._id)
          .populate('sender', 'full_name username profile_picture friends')
          .populate('receiver', 'full_name username profile_picture friends');
        
        if (populatedRequest) {
          // Calculate mutual friends count
          const senderFriends = populatedRequest.sender.friends || [];
          const receiverFriends = populatedRequest.receiver.friends || [];
          
          const mutualFriendsCount = senderFriends.filter(senderFriendId => 
            receiverFriends.some(receiverFriendId => 
              senderFriendId.toString() === receiverFriendId.toString()
            )
          ).length;
          
          await syncFriendRequest(populatedRequest.receiver._id.toString(), {
            _id: populatedRequest._id,
            from: populatedRequest.sender._id,
            to: populatedRequest.receiver._id,
            sender: {
              _id: populatedRequest.sender._id,
              full_name: populatedRequest.sender.full_name,
              username: populatedRequest.sender.username,
              profile_picture: populatedRequest.sender.profile_picture
            },
            status: populatedRequest.status,
            created_at: populatedRequest.created_at,
            mutualFriendsCount: mutualFriendsCount
          });
        }
      } else if (change.operationType === 'update') {
        const requestId = change.documentKey._id;
        const updatedFields = change.updateDescription.updatedFields;
        
        if (updatedFields.status) {
          const request = await FriendRequest.findById(requestId);
          if (request) {
            await updateFriendRequestStatus(
              request.receiver._id.toString(), 
              requestId.toString(), 
              updatedFields.status
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in friend request change stream:', error);
    }
  });
  
  // Notification change stream - Only sync NEW/UNSEEN notifications to Firebase
  const notificationStream = Notification.watch();
  notificationStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert') {
        // Only sync newly created notifications to Firebase for real-time delivery
        if (change.fullDocument) {
          const recipientId = change.fullDocument.recipient._id.toString();
          // Only sync if the notification is unseen (newly created notifications are always unseen)
          if (!change.fullDocument.is_seen) {
            await syncNotification(recipientId, change.fullDocument);
          }
        }
      } else if (change.operationType === 'update') {
        // Handle updates carefully - only sync if becoming unseen again (rare case)
        if (change.fullDocument && change.updateDescription) {
          const recipientId = change.fullDocument.recipient._id.toString();
          const updatedFields = change.updateDescription.updatedFields;
          
          // If notification is being marked as seen, do NOT sync to Firebase
          // If notification is being marked as unseen (rare), sync to Firebase
          if (updatedFields.hasOwnProperty('is_seen')) {
            if (!updatedFields.is_seen) {
              // Notification becoming unseen - sync to Firebase
              await syncNotification(recipientId, change.fullDocument);
            }
          } else {
            // Other field updates - only sync if notification is still unseen
            if (!change.fullDocument.is_seen) {
              await syncNotification(recipientId, change.fullDocument);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in notification change stream:', error);
    }
  });
  
  // Error handling for all streams
  [notificationStream, friendRequestStream].forEach(stream => {
    stream.on('error', (error) => {
      console.error('Change stream error:', error);
      // Attempt to restart the stream after a delay
      setTimeout(() => initializeChangeStreams(), 5000);
    });
  });
};

// Helper function to get unseen events for a user
const getUnseenEventsForUser = async (userId) => {
  // Get the user with their friends information
  const user = await User.findById(userId).populate('friends');
  
  if (!user || !user.friends || user.friends.length === 0) {
    return [];
  }
  
  const friendsWithEvents = [];
  
  for (const friend of user.friends) {
    const friendId = friend._id.toString();
    
    // Find the last_checked_events entry for this friend
    const lastCheckedEntry = user.last_checked_events.find(
      entry => entry.friend && entry.friend.toString() === friendId
    );
    
    // Get a list of already viewed event IDs
    const viewedEventIds = lastCheckedEntry 
      ? lastCheckedEntry.viewed_events.map(ve => ve.event.toString()) 
      : [];
    
    // Get most recent viewed date for this friend, or default to epoch
    const lastViewedAt = lastCheckedEntry && lastCheckedEntry.viewed_events.length > 0
      ? new Date(Math.max(...lastCheckedEntry.viewed_events.map(ve => ve.viewed_at.getTime())))
      : new Date(0);
    
    // Get events created by this friend that haven't been seen by the user
    const events = await Event.find({
      created_by: friend._id,
      $or: [
        // Either not in the viewed_events list
        { _id: { $nin: viewedEventIds } },
        // Or created after the last view time
        { created_at: { $gt: lastViewedAt } }
      ]
    }).sort('-created_at');
    
    if (events.length > 0) {
      friendsWithEvents.push({
        friend: {
          _id: friend._id,
          full_name: friend.full_name,
          profile_picture: friend.profile_picture
        },
        unseen_events: events
      });
    }
  }
  
  return friendsWithEvents;
};

module.exports = {
  initializeChangeStreams
};