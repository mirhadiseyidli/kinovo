const User = require('../database/schemas/usersSchema');
const jwt = require('jsonwebtoken');

const crypto = require('crypto');

require('dotenv').config();

const getUserProfile = async (req, res) => {
  try {
    res.status(200).json(res.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password_hash');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUsers = async (req, res) => {
  let user;
  try {
    user = await User.deleteOne({ _id: res.user.id }).select('-password_hash');
    res.status(200).json('Deleted the user');
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const editUser = async (req, res) => {
  const { id } = req.params;
  const updateFields = req.params;

  try {
    const user = await User.findOneAndUpdate(
      { _id: id }, 
      { $set: updateFields }, 
      { new: true } 
    ).select('-password_hash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    };

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  };
};

const createUser = async (req, res) => {
  try {
    const { userData } = req.params;

    const user = await User.create(userData);

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  };
};

const findMe = async (req, res) => {
  try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not logged in' });
      }

      const userId = req.user.id;
      const user = await User.findOne({ uuid: userId }).select('-password_hash');
      console.log(user)
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
};

const getUser = async (req, res, next) => {
  let found_user;
  try {
    found_user = await User.findOne({ _id: req.params.id }).select('-password_hash');
    if (found_user == null) {
      return res.status(404).json({ message: 'Cannot find the user' });
    };
  } catch (err) {
    return res.status(500).json({ message: err.message });
  };

  res.user = found_user;
  next();
};

const getUserFriendByEmailSearch = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { email } = req.query.query;
    const found_user = await User.findOne({ uuid: req.user.id }).populate({
      path: 'friends',
      match: { email: { $regex: email, $options: 'i' } }, // Case-insensitive search
      select: '-password_hash'
    });

    res.status(200).json(found_user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const getUserFriendByNameSearch = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { name } = req.query.query;
    const found_user = await User.findOne({ uuid: req.user.id }).populate({
      path: 'friends',
      match: { $or: [
        { first_name: { $regex: name, $options: 'i' } }, 
        { last_name: { $regex: name, $options: 'i' } }
      ]}, // Case-insensitive search by first or last name
      select: '-password_hash'
    });

    res.status(200).json(found_user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const sendFriendRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingRequest = receiver.friend_requests.find(
      req => req.sender.toString() === senderId && req.receiver.toString() === receiverId
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    receiver.friend_requests.push({ sender: senderId, receiver: receiverId, status: 'pending' });
    await receiver.save();

    res.status(200).json({ message: 'Friend request sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const respondToAFriendRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not logged in' });
    }

    const { requestId, status } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friendRequest = user.friend_requests.find(req => req._id.toString() === requestId);

    if (!friendRequest || friendRequest.receiver.toString() !== userId) {
      return res.status(404).json({ message: 'Friend request not found or unauthorized' });
    }

    friendRequest.status = status;
    await user.save();

    if (status === 'accepted') {
      await User.findByIdAndUpdate(userId, { $push: { friends: friendRequest.sender } });
      await User.findByIdAndUpdate(friendRequest.sender, { $push: { friends: userId } });
    }

    res.status(200).json({ message: `Friend request ${status}` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editUser,
  createUser,
  findMe,
  getUser,
  getUserFriendByEmailSearch,
  getUserFriendByNameSearch,
  sendFriendRequest,
  respondToAFriendRequest
 };
