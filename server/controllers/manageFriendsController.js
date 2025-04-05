const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');

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

    const friendRequest = await FriendRequest.findOneAndDelete({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or cannot be cancelled' });
    }

    res.status(200).json({ message: 'Friend request cancelled successfully', friendRequest });
  } catch (error) {
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

    const friendRequest = await FriendRequest.findOneAndDelete({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or cannot be cancelled' });
    }

    res.status(200).json({ message: 'Friend request cancelled successfully', friendRequest });
  } catch (error) {
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
    res.status(200).json({ requests });
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