const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');
const UserContacts = require('../database/schemas/userContactsSchema');
const { updateFriendRequestNotificationStatus, createNotification, createFriendRequestNotification, sendFriendRequestPushNotification, sendEventInvitationPushNotification } = require('./notificationsController');
const { sendEmailNotification } = require('../utils/emailNotificationService');
const { removeFriendRequestFromFirebase } = require('../services/realtimeSyncService');
const { sendEmail } = require('../utils/emailService');

// Invite a friend by email
const inviteFriendByEmail = async (req, res) => {
  try {
    const { email: recipientEmail } = req.body;
    const userId = req.user._id;

    const sender = await Users.findById(userId);

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    // Check if the user is trying to invite themselves
    if (recipientEmail.toLowerCase() === sender.email.toLowerCase()) {
      return res.status(400).json({ message: 'You cannot invite yourself.' });
    }

    // Check if the recipient is already a user on Kinovo
    const existingUser = await Users.findOne({ email: recipientEmail.toLowerCase() });
    if (existingUser) {
      // Check if they are already friends
      const areFriends = sender.friends.includes(existingUser._id);
      if (areFriends) {
        return res.status(400).json({ message: 'You are already friends with this user.' });
      } else {
        return res.status(400).json({ message: 'This user is already on Kinovo. You can send them a friend request directly.' });
      }
    }

    // Prepare and send the invitation email
    const subject = `${sender.full_name} has invited you to join Kinovo!`;
    const html = `<p>Hey!</p>
                  <p>${sender.full_name} (${sender.username}) is inviting you to join Kinovo, the app to discover and create events with friends.</p>
                  <p>Join them by downloading the app!</p>
                  <p>Download the app here: <a href="https://kinovo.app/invite">https://kinovo.app/invite</a></p>
                  <p>Thanks,</p>
                  <p>The Kinovo Team</p>`;
    
    await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: html,
    });

    res.status(200).json({ message: 'Invitation sent successfully.' });

  } catch (error) {
    console.error('Error inviting friend by email:', error);
    res.status(500).json({ message: 'Server error while sending invitation.' });
  }
};

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

    // Check if they are already friends
    const sender_user = await Users.findById(sender);
    if (sender_user.friends.includes(receiver)) {
      return res.status(400).json({ message: 'You are already friends with this user' });
    }

    // Check if either user has blocked the other
    const isBlockedByReceiver = receiver_found.blocked_users.some(
      block => block.user.toString() === sender.toString()
    );
    const hasBlockedReceiver = sender_user.blocked_users.some(
      block => block.user.toString() === receiver.toString()
    );

    if (isBlockedByReceiver || hasBlockedReceiver) {
      return res.status(403).json({ message: 'Cannot send friend request to this user' });
    }

    // Check if there's already a pending request from sender to receiver
    const existingRequest = await FriendRequest.findOne({
      sender: sender,
      receiver: receiver,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if there's already a pending request from receiver to sender
    const reverseRequest = await FriendRequest.findOne({
      sender: receiver,
      receiver: sender,
      status: 'pending'
    });

    if (reverseRequest) {
      // If receiver already sent a request to sender, automatically accept both
      // and make them friends instead of creating a duplicate request
      await FriendRequest.findByIdAndDelete(reverseRequest._id);
      
      // Remove from Firebase for both users
      await removeFriendRequestFromFirebase(sender, reverseRequest._id.toString());
      await removeFriendRequestFromFirebase(receiver, reverseRequest._id.toString());
      
      await Users.findByIdAndUpdate(sender, { $addToSet: { friends: receiver } });
      await Users.findByIdAndUpdate(receiver, { $addToSet: { friends: sender } });
      
      // Create acceptance notification for the original sender (receiver of current request)
      const senderUser = await Users.findById(sender);
      const receiverUser = await Users.findById(receiver);
      
      if (senderUser && receiverUser) {
        // Check if receiver wants to receive friend request accepted notifications
        const { shouldReceiveNotification } = require('./notificationsController');
        const shouldReceiveInApp = await shouldReceiveNotification(receiver, 'friend_request_accepted', 'inApp');
        const shouldReceiveEmail = await shouldReceiveNotification(receiver, 'friend_request_accepted', 'email');
        
        if (shouldReceiveInApp || shouldReceiveEmail) {
          // Create in-app notification if enabled
          if (shouldReceiveInApp) {
            const notification = await createNotification({
              recipient: receiver,
              sender: sender,
              type: 'friend_request_accepted',
              title: 'Friend Request Accepted',
              subtitle: `${senderUser.full_name} accepted your friend request`,
              status: 'unseen'
            });
          }

          // Send email notification if enabled
          if (shouldReceiveEmail && receiverUser.email) {
            await sendEmailNotification(receiverUser.email, 'friend_request_accepted', {
              accepterName: senderUser.full_name,
              accepterUsername: senderUser.username
            });
          }
        }
      }
      
      return res.status(200).json({ 
        message: 'Mutual friend requests found - you are now friends!', 
        friendRequest: reverseRequest,
        autoAccepted: true 
      });
    }

    const friendRequest = new FriendRequest({
      sender: sender,
      receiver: receiver,
      status: 'pending'
    });

    await friendRequest.save();

    // Don't create notification banners for friend requests - they only show in Friend Requests section
    await createFriendRequestNotification(friendRequest._id, sender, receiver);


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

    // Remove from Firebase for both sender and receiver
    await removeFriendRequestFromFirebase(receiver, friendRequest._id.toString());
    await removeFriendRequestFromFirebase(sender, friendRequest._id.toString());

    await Users.findByIdAndUpdate(receiver, { $addToSet: { friends: sender } });
    await Users.findByIdAndUpdate(sender, { $addToSet: { friends: receiver } });

    // Create a notification for the sender that their request was accepted
    const receiverUser = await Users.findById(receiver);
    const senderUser = await Users.findById(sender);
    
    if (receiverUser && senderUser) {
      // Check if sender wants to receive friend request accepted notifications
      const { shouldReceiveNotification } = require('./notificationsController');
      const shouldReceiveInApp = await shouldReceiveNotification(sender, 'friend_request_accepted', 'inApp');
      const shouldReceiveEmail = await shouldReceiveNotification(sender, 'friend_request_accepted', 'email');
      
      if (shouldReceiveInApp || shouldReceiveEmail) {
        // Create in-app notification if enabled
        if (shouldReceiveInApp) {
          const notification = await createNotification({
            recipient: sender,
            sender: receiver,
            type: 'friend_request_accepted',
            title: 'Friend Request Accepted',
            subtitle: `${receiverUser.full_name} accepted your friend request`,
            status: 'unseen'
          });
        }

        // Send email notification if enabled
        if (shouldReceiveEmail && senderUser.email) {
          await sendEmailNotification(senderUser.email, 'friend_request_accepted', {
            accepterName: receiverUser.full_name,
            accepterUsername: receiverUser.username
          });
        }
      } else {
        console.log(`User ${sender} has disabled all friend request accepted notifications`);
      }
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

    // Remove from Firebase for both sender and receiver
    await removeFriendRequestFromFirebase(receiver, friendRequest._id.toString());
    await removeFriendRequestFromFirebase(sender, friendRequest._id.toString());

    // Note: We intentionally do not send a rejection notification to avoid creating
    // negative feelings. The sender will simply see the request disappear from their
    // pending requests list.

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

    // Delete the friend request from database
    const deletedRequest = await FriendRequest.findByIdAndDelete(friendRequest._id);

    // Remove from Firebase for both sender and receiver
    await removeFriendRequestFromFirebase(sender, friendRequestId);
    await removeFriendRequestFromFirebase(receiver, friendRequestId);

    // Remove any related notifications for this friend request
    const Notification = require('../database/schemas/notificationsSchema');
    const deletedNotifications = await Notification.deleteMany({ 
      friend_request: friendRequest._id,
      type: 'friend_request'
    });

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

    // Delete the friend request from database
    await FriendRequest.findByIdAndDelete(friendRequest._id);

    // Remove from Firebase for both sender and receiver
    await removeFriendRequestFromFirebase(receiver, friendRequestId);
    await removeFriendRequestFromFirebase(sender, friendRequestId);

    // Remove any related notifications for this friend request
    const Notification = require('../database/schemas/notificationsSchema');
    const deletedNotifications = await Notification.deleteMany({ 
      friend_request: friendRequest._id,
      type: 'friend_request'
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

    // Store contacts for future join detection
    const contactPromises = phoneNumbers.map(async (phoneNumber) => {
      try {
        await UserContacts.findOneAndUpdate(
          { user: req.user._id, phoneNumber },
          { user: req.user._id, phoneNumber },
          { upsert: true, new: true }
        );
      } catch (error) {
        // Ignore duplicate key errors
        if (error.code !== 11000) {
          console.error('Error storing contact:', error);
        }
      }
    });

    await Promise.all(contactPromises);

    // Find existing users
    const users = await Users.find({ 'phone_number.full_num': { $in: phoneNumbers } })
      .select('_id full_name username profile_picture phone_number.full_num');
    
    const existingNumbers = users.map(u => ({
      _id: u._id,
      phoneNumber: u.phone_number.full_num,
      full_name: u.full_name,
      username: u.username,
      profile_picture: u.profile_picture
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

    // Remove friend from user's friends list
    await Users.findByIdAndUpdate(userId, {
      $pull: { 
        friends: friendId,
        // Remove friend from all tags
        'tags.$[].friends': friendId
      }
    });

    // Remove user from friend's friends list and tags
    await Users.findByIdAndUpdate(friendId, {
      $pull: { 
        friends: userId,
        // Remove user from all tags
        'tags.$[].friends': userId
      }
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

// Check friendship status for multiple users
const checkFriendshipStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { userIds } = req.body;
    const currentUserId = req.user._id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    const statuses = {};

    // Get current user's friends list
    const currentUser = await Users.findById(currentUserId).select('friends');
    const friendIds = currentUser.friends.map(friendId => friendId.toString());

    // Check each user ID
    for (const userId of userIds) {
      if (friendIds.includes(userId)) {
        statuses[userId] = 'alreadyFriends';
      } else {
        // Check if there's a pending friend request from current user to this user
        const pendingRequest = await FriendRequest.findOne({
          sender: currentUserId,
          receiver: userId,
          status: 'pending'
        });

        if (pendingRequest) {
          statuses[userId] = 'requestSent';
        } else {
          statuses[userId] = 'onKinovo';
        }
      }
    }

    res.status(200).json({ statuses });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
  getNumberOfFriendsNewEvents,
  checkFriendshipStatus,
  inviteFriendByEmail
};