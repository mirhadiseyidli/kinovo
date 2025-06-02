const mongoose = require('mongoose');
const WebSocket = require('ws');
const Notification = require('../../database/schemas/notificationsSchema');

const registerNotificationsWatcher = (userId, ws) => {
  if (!mongoose.isValidObjectId(userId)) return;

  // Function to get unseen notification count
  const getUnseenCount = async (userId) => {
    try {
      const count = await Notification.countDocuments({ 
        recipient: new mongoose.Types.ObjectId(userId), 
        is_seen: false 
      });
      return count;
    } catch (error) {
      console.error('Error getting unseen count:', error);
      return 0;
    }
  };

  // Debounce function to prevent spam updates
  let updateTimeout = null;
  let pendingUpdates = 0;
  
  const sendCountUpdate = async (delay = 300) => {
    pendingUpdates++;
    
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    updateTimeout = setTimeout(async () => {
      try {
        const unseenCount = await getUnseenCount(userId);
        console.log(`Sending debounced notification count update to user ${userId}: ${unseenCount} (processed ${pendingUpdates} updates)`);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'notificationCountUpdate',
            unseenCount: unseenCount
          }));
        }
        
        // Reset pending updates counter
        pendingUpdates = 0;
      } catch (error) {
        console.error('Error sending debounced count update:', error);
      }
    }, delay);
  };

  // Watch for changes in notifications where this user is the recipient
  const notificationChangeStream = Notification.watch(
    [
      {
        $match: {
          $and: [
            { 'fullDocument.recipient': new mongoose.Types.ObjectId(`${userId}`) },
            {
              $or: [
                { operationType: 'insert' },
                { 
                  operationType: 'update',
                  'updateDescription.updatedFields.is_seen': { $exists: true }
                }
              ]
            }
          ]
        }
      }
    ],
    {
      fullDocument: 'updateLookup'
    }
  );

  notificationChangeStream.on('change', async (change) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        console.log(`Notification change stream detected ${change.operationType} for user ${userId}, notification ${change.fullDocument?._id}`);

        if (change.operationType === 'insert') {
          // New notification created - send immediately with current count
          const populatedNotification = await Notification.findById(change.fullDocument._id)
            .populate('sender', 'full_name username profile_picture')
            .populate('event', 'title')
            .populate('friend_request');
          
          if (populatedNotification) {
            const unseenCount = await getUnseenCount(userId);
            console.log(`Sending new notification via WebSocket to user ${userId}`);
            ws.send(JSON.stringify({
              type: 'newNotification',
              data: populatedNotification,
              unseenCount: unseenCount
            }));
          }
        } else if (change.operationType === 'update') {
          // Notification updated (likely marked as seen) - debounce the count update
          console.log(`Debouncing notification count update for user ${userId} (pending: ${pendingUpdates + 1})`);
          sendCountUpdate();
        }
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  });

  notificationChangeStream.once('error', (err) => {
    console.error('Notification change stream error:', err);
  });

  ws.on('close', () => {
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    notificationChangeStream.close();
  });
};

module.exports = { registerNotificationsWatcher }; 