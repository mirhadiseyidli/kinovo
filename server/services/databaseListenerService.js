const mongoose = require('mongoose');
const User = require('../database/schemas/usersSchema');
const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Notification = require('../database/schemas/notificationsSchema');
const Event = require('../database/schemas/eventsSchema');
const { 
  syncFriendRequest, 
  updateFriendRequestStatus, 
  syncNotifications, 
  syncFriendEventActivities
} = require('./realtimeSyncService');

// Initialize all change streams
const initializeChangeStreams = () => {
  console.log('Initializing database change streams...');
  
  // Friend Request change stream
  const friendRequestStream = FriendRequest.watch();
  friendRequestStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert') {
        const newRequest = change.fullDocument;
        await syncFriendRequest(newRequest.receiver._id.toString(), {
          _id: newRequest._id,
          from: newRequest.sender,
          to: newRequest.receiver,
          status: newRequest.status,
          created_at: newRequest.created_at
        });
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
  
  // Notification change stream
  const notificationStream = Notification.watch();
  notificationStream.on('change', async (change) => {
    try {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        // For insert or update operations, we have the fullDocument
        if (change.fullDocument) {
          // Notifications have recipient field, not user
          const recipientId = change.fullDocument.recipient._id.toString();
          const notifications = await Notification.find({ recipient: recipientId })
            .populate('event')
            .populate('sender')
            .sort('-created_at');
          await syncNotifications(recipientId, notifications);
        }
      } else if (change.operationType === 'delete') {
        // For delete operations, we don't have the fullDocument
        // We need to retrieve affected users and update all their notifications
        
        // Log the operation to help with debugging
        console.log('Delete operation detected:', change.documentKey);
        
        // Since we can't determine the recipient from a deleted notification,
        // we need to sync notifications for all users to ensure consistency
        const users = await User.find({});
        
        for (const user of users) {
          const userId = user._id.toString();
          const notifications = await Notification.find({ recipient: userId }).sort('-created_at');
          await syncNotifications(userId, notifications);
        }
      }
    } catch (error) {
      console.error('Error in notification change stream:', error);
    }
  });
  
  // Event change stream for friend activity
  // const eventStream = Event.watch();
  // eventStream.on('change', async (change) => {
  //   try {
  //     if (['insert', 'update'].includes(change.operationType)) {
  //       if (change.fullDocument) {
  //         const event = change.fullDocument;
  //         // Handle both populated and unpopulated creator field
  //         const creatorId = event.creator && typeof event.creator === 'object' 
  //           ? event.creator._id.toString() 
  //           : event.creator.toString();
          
  //         // Get all friends of the event creator
  //         const creator = await User.findById(creatorId);
  //         if (creator && creator.friends && creator.friends.length > 0) {
  //           // For each friend, update their activity feed
  //           for (const friendId of creator.friends) {
  //             // Handle both populated and unpopulated friend IDs
  //             const friendIdStr = typeof friendId === 'object' 
  //               ? friendId._id.toString() 
  //               : friendId.toString();
              
  //             // Get all unseen events for this friend
  //             const unseenEvents = await getUnseenEventsForUser(friendIdStr);
  //             await syncFriendEventActivities(friendIdStr, unseenEvents);
  //           }
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error in event change stream:', error);
  //   }
  // });
  
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