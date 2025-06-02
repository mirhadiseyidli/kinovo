const mongoose = require('mongoose');
const WebSocket = require('ws');
const User = require('../../database/schemas/usersSchema');
const FriendRequest = require('../../database/schemas/friendRequestsSchema');

const registerFriendWatcher = (userId, ws) => {
  if (!mongoose.isValidObjectId(userId)) return;

  // Watch for changes to user's friends list (when they accept/decline requests)
  const userChangeStream = User.watch(
    [
      {
        $match: {
          'documentKey._id': new mongoose.Types.ObjectId(`${userId}`),
          operationType: 'update',
        }
      }
    ],
    {
      fullDocument: 'updateLookup',
      fullDocumentBeforeChange: 'required',
    }
  );

  userChangeStream.on('change', (change) => {
    const oldFriends = change.fullDocumentBeforeChange?.friends || [];
    const newFriends = change.fullDocument?.friends || [];

    const added = newFriends.filter(
      id => !oldFriends.some(old => old.toString() === id.toString())
    );
    const removed = oldFriends.filter(
      id => !newFriends.some(cur => cur.toString() === id.toString())
    );

    if (added.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'friendAdded',
        addedBy: userId,
        addedFriendId: added[0].toString()
      }));
    }

    if (removed.length && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'friendRemoved',
        removedBy: userId,
        removedFriendId: removed[0].toString()
      }));
    }
  });

  // Watch for new friend requests where this user is the receiver
  const friendRequestChangeStream = FriendRequest.watch(
    [
      {
        $match: {
          operationType: 'insert',
          'fullDocument.receiver': new mongoose.Types.ObjectId(`${userId}`)
        }
      }
    ],
    {
      fullDocument: 'updateLookup'
    }
  );

  friendRequestChangeStream.on('change', async (change) => {
    if (change.operationType === 'insert' && ws.readyState === WebSocket.OPEN) {
      try {
        // Populate the sender information
        const populatedRequest = await FriendRequest.findById(change.fullDocument._id).populate('sender');
        
        if (populatedRequest) {
          // Calculate actual mutual friends count
          const receiver = await User.findById(userId).select('friends');
          const sender = await User.findById(populatedRequest.sender._id).select('friends');
          
          const receiverFriends = receiver?.friends || [];
          const senderFriends = sender?.friends || [];
          
          // Find mutual friends by comparing friend arrays
          const mutualFriends = receiverFriends.filter(receiverFriendId => 
            senderFriends.some(senderFriendId => 
              receiverFriendId.toString() === senderFriendId.toString()
            )
          );
          
          console.log(`Sending new friend request notification to user ${userId}`);
          ws.send(JSON.stringify({
            type: 'newFriendRequest',
            data: {
              _id: populatedRequest._id,
              sender: {
                _id: populatedRequest.sender._id,
                full_name: populatedRequest.sender.full_name,
                username: populatedRequest.sender.username,
                profile_picture: populatedRequest.sender.profile_picture
              },
              mutualFriendsCount: mutualFriends.length,
              created_at: populatedRequest.created_at
            }
          }));
        }
      } catch (error) {
        console.error('Error sending friend request notification:', error);
      }
    }
  });

  userChangeStream.once('error', (err) => {
    console.error('User change stream error:', err);
  });

  friendRequestChangeStream.once('error', (err) => {
    console.error('Friend request change stream error:', err);
  });

  ws.on('close', () => {
    userChangeStream.close();
    friendRequestChangeStream.close();
  });
};

module.exports = { registerFriendWatcher };