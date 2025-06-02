const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');
const { sendNotificationToUser } = require('../websocket/websocketUtils');
const { createFriendRequestNotification, updateFriendRequestNotificationStatus, createNotification } = require('./notificationsController');

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { receiver } = req.body;
    const sender = req.user._id;

    if (!receiver) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (sender === receiver) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const receiver_found = await Users.findById(receiver);
    if (!receiver_found) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingRequest = await FriendRequest.findOne({
      sender: sender,
      receiver: receiver,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    const friendRequest = new FriendRequest({
      sender: sender,
      receiver: receiver,
      status: 'pending'
    });

    await friendRequest.save();

    // Note: The friend request watcher will automatically send the WebSocket notification
    // No need to create a separate notification here to avoid duplicates

    res.status(200).json({ message: 'Friend request sent successfully', friendRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const receiver = req.user._id;
    const { sender } = req.body;

    if (!sender) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }

    const friendRequest = await FriendRequest.findOneAndDelete({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or invalid sender/receiver' });
    }

    await Users.findByIdAndUpdate(receiver, { $addToSet: { friends: sender } });
    await Users.findByIdAndUpdate(sender, { $addToSet: { friends: receiver } });

    // Send WebSocket notification to receiver that friend request was accepted
    sendNotificationToUser(receiver.toString(), {
      type: 'friendRequestAccepted',
      requestId: friendRequest._id.toString()
    });

    // Create a notification for the sender that their request was accepted
    const receiverUser = await Users.findById(receiver);
    if (receiverUser) {
      const notification = await createNotification({
        recipient: sender,
        sender: receiver,
        type: 'friend_request_accepted',
        title: 'Friend Request Accepted',
        subtitle: `${receiverUser.full_name} accepted your friend request`,
        status: 'unseen'
      });

      // Send real-time notification via WebSocket
      sendNotificationToUser(sender.toString(), {
        type: 'newNotification',
        data: notification
      });
    }

    res.status(200).json({ message: 'Friend request accepted', friendRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject friend request
const rejectFriendRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const receiver = req.user._id;
    const { sender } = req.body;

    if (!sender) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }

    const friendRequest = await FriendRequest.findOneAndDelete({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or invalid sender/receiver' });
    }

    // Send WebSocket notification to receiver that friend request was rejected
    sendNotificationToUser(receiver.toString(), {
      type: 'friendRequestRejected',
      requestId: friendRequest._id.toString()
    });

    // Create a notification for the sender that their request was rejected
    const receiverUser = await Users.findById(receiver);
    if (receiverUser) {
      const notification = await createNotification({
        recipient: sender,
        sender: receiver,
        type: 'friend_request_rejected',
        title: 'Friend Request Declined',
        subtitle: `${receiverUser.full_name} declined your friend request`,
        status: 'unseen'
      });

      // Send real-time notification via WebSocket
      sendNotificationToUser(sender.toString(), {
        type: 'newNotification',
        data: notification
      });
    }

    res.status(200).json({ message: 'Friend request rejected', friendRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel friend request
const cancelFriendRequestSender = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const sender = req.user._id;
    const { receiver } = req.body;

    if (!receiver) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    // Find the friend request first to get the ID before deleting
    const friendRequest = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or cannot be cancelled' });
    }

    const friendRequestId = friendRequest._id.toString();
    console.log(`Cancelling friend request ${friendRequestId} from ${sender} to ${receiver}`);

    // Send WebSocket notification to receiver BEFORE deleting anything
    console.log(`Sending WebSocket cancellation message to receiver ${receiver} for request ${friendRequestId}`);
    const websocketSent = sendNotificationToUser(receiver.toString(), {
      type: 'friendRequestCancelled',
      requestId: friendRequestId
    });
    console.log(`WebSocket message sent successfully: ${websocketSent}`);

    // Delete the friend request
    const deletedRequest = await FriendRequest.findByIdAndDelete(friendRequest._id);
    console.log(`Deleted friend request:`, deletedRequest ? 'SUCCESS' : 'FAILED');

    // Remove any related notifications for this friend request
    const Notification = require('../database/schemas/notificationsSchema');
    const deletedNotifications = await Notification.deleteMany({ 
      friend_request: friendRequest._id,
      type: 'friend_request'
    });
    console.log(`Deleted ${deletedNotifications.deletedCount} notifications for friend request ${friendRequestId}`);

    res.status(200).json({ message: 'Friend request cancelled successfully', friendRequest });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: error.message });
  }
};

const cancelFriendRequestReceiver = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const receiver = req.user._id;
    const { sender } = req.body;

    if (!sender) {
      return res.status(400).json({ message: 'Sender ID is required' });
    }

    // Find the friend request first to get the ID before deleting
    const friendRequest = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or cannot be cancelled' });
    }

    const friendRequestId = friendRequest._id.toString();
    console.log(`Receiver ${receiver} cancelling friend request ${friendRequestId} from ${sender}`);

    // Delete the friend request
    await FriendRequest.findByIdAndDelete(friendRequest._id);

    // Remove any related notifications for this friend request
    const Notification = require('../database/schemas/notificationsSchema');
    const deletedNotifications = await Notification.deleteMany({ 
      friend_request: friendRequest._id,
      type: 'friend_request'
    });
    console.log(`Deleted ${deletedNotifications.deletedCount} notifications for friend request ${friendRequestId}`);

    // Send WebSocket notification to receiver that friend request was cancelled
    console.log(`Sending WebSocket cancellation message to receiver ${receiver}`);
    sendNotificationToUser(receiver.toString(), {
      type: 'friendRequestCancelled',
      requestId: friendRequestId
    });

    res.status(200).json({ message: 'Friend request cancelled successfully', friendRequest });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: error.message });
  }
};

const getUserFriends = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const user = await Users.findById(userId).populate('friends');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ friends: user.friends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserToViewFriends = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.query._id;
    const user = await Users.findById(userId).populate('friends');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ friends: user.friends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

const syncContacts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { phoneNumbers } = req.body;
    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ message: 'Phone numbers are required and should be an array' });
    }

    const users = await Users.find({ 'phone_number.full_num': { $in: phoneNumbers } });
    const existingNumbers = users.map(u => ({
      _id: u._id,
      phoneNumber: u.phone_number.full_num
    }));
    res.status(200).json(existingNumbers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReceivedFriendRequests = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const receiverId = req.user._id;
    const requests = await FriendRequest.find({ receiver: receiverId, status: 'pending' }).populate('sender');
    
    // Get receiver's friends list to calculate mutual friends
    const receiver = await Users.findById(receiverId).select('friends');
    const receiverFriends = receiver?.friends || [];
    
    // Calculate mutual friends count for each request
    const requestsWithMutualFriends = await Promise.all(
      requests.map(async (request) => {
        // Get sender's friends list
        const sender = await Users.findById(request.sender._id).select('friends');
        const senderFriends = sender?.friends || [];
        
        // Find mutual friends by comparing friend arrays
        const mutualFriends = receiverFriends.filter(receiverFriendId => 
          senderFriends.some(senderFriendId => 
            receiverFriendId.toString() === senderFriendId.toString()
          )
        );
        
        return {
          ...request.toObject(),
          mutualFriendsCount: mutualFriends.length
        };
      })
    );
    
    res.status(200).json({ requests: requestsWithMutualFriends });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeFriendFromFriendsList = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const userId = req.user._id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID is required' });
    }

    await Users.findByIdAndUpdate(userId, {
      $pull: { friends: friendId }
    });

    await Users.findByIdAndUpdate(friendId, {
      $pull: { friends: userId }
    });

    res.status(200).json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getNumberOfFriendsNewEvents = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await Users.findById(userId)
      .populate({
        path: 'friends',
        populate: {
          path: 'events',
          match: { start_time: { $gte: new Date() } },
          select: 'start_time',
        },
      })
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });

    const summary = user.friends.map(friend => {
      const lastChecked = user.last_checked_events?.find(
        entry => String(entry.friend) === String(friend._id)
      )?.viewed_at || new Date(0);

      const newEventCount = (friend.events || []).filter(event => {
        return new Date(event.start_time) > lastChecked;
      }).length;

      return {
        friendId: friend._id,
        newEventCount
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('Error in /event-activity-summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequestSender,
  cancelFriendRequestReceiver,
  getUserFriends,
  syncContacts,
  getReceivedFriendRequests,
  removeFriendFromFriendsList,
  getUserToViewFriends,
  getNumberOfFriendsNewEvents
};