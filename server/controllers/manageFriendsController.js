const FriendRequest = require('../database/schemas/friendRequestsSchema');
const Users = require('../database/schemas/usersSchema');

// Send friend request
const sendFriendRequest = async (req, res) => {
  try {
    const sender = req.user._id
    const { receiver } = req.body;

    // Check if a pending friend request already exists between these users
    const existingRequest = await FriendRequest.findOne({ sender, receiver, status: 'pending' });

    if (existingRequest) {
      return res.status(400).json({ error: 'You have already attempted to add this person' });
    }

    const friendRequest = new FriendRequest({ sender, receiver });
    
    await friendRequest.save();

    res.status(201).json({ message: 'Friend request sent successfully', friendRequest });
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: error.message });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const sender = req.user._id
    const { receiver } = req.body;

    // Find the pending friend request by sender and receiver
    const friendRequest = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or invalid sender/receiver' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    res.status(200).json({ message: 'Friend request accepted', friendRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject friend request
const rejectFriendRequest = async (req, res) => {
  try {
    const sender = req.user._id
    const { receiver } = req.body;

    // Find the pending friend request by sender and receiver
    const friendRequest = await FriendRequest.findOne({ sender, receiver, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found or invalid sender/receiver' });
    }

    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.status(200).json({ message: 'Friend request rejected', friendRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel friend request
const cancelFriendRequest = async (req, res) => {
  try {
    const sender = req.user._id
    const { receiver } = req.body;

    // Only the sender can cancel a pending friend request.
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

const syncContacts = async (req, res) => {
  try {
    const { phoneNumbers } = req.body;
    const users = await Users.find({ 'phone_number.full_num': { $in: phoneNumbers } });
    const existingNumbers = users.map(u => u.phone_number.full_num);
    res.status(200).json(existingNumbers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReceivedFriendRequests = async (req, res) => {
  try {
    const receiverId = req.user._id;
    const requests = await FriendRequest.find({ receiver: receiverId, status: 'pending' }).populate('sender');
    res.status(200).json({ requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getUserFriends,
  syncContacts,
  getReceivedFriendRequests,
};