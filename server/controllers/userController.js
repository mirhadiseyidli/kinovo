const User = require('../database/schemas/usersSchema');
const FriendRequests = require('../database/schemas/friendRequestsSchema');

require('dotenv').config();

const getUserProfile = async (req, res) => {
  try {
    const found_request = await FriendRequests.findOne({ sender: req.user._id, receiver: res.user._id });
    res.status(200).json({ user: res.user, friendRequest: found_request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsersFriendsList = async (req, res) => {
  try {
    const found_request = await FriendRequests.findOne({ sender: req.user._id, receiver: res.user._id });
    res.status(200).json({ user: res.user, friendRequest: found_request });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUsers = async (req, res) => {
  let user;
  try {
    user = await User.deleteOne({ _id: res.user._id }).select('-password');
    console.log('deleted', user)
    res.status(200).json('Deleted the user', user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const editMyProfile = async (req, res) => {
  const user_id = req.user._id;
  const updateFields = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { _id: user_id }, 
      { $set: updateFields }, 
      { new: true } 
    ).select('-password');

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
    const userData = req.body;

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

      const userId = req.user._id;
      const user = await User.findOne({ _id: userId }).select('-password');
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
    found_user = await User.findOne({ _id: req.query._id }).select('-password');
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

    const email = req.query.query;
    const found_user = await User.findOne({ _id: req.user._id }).populate({
      path: 'friends',
      match: { email: { $regex: email, $options: 'i' } }, // Case-insensitive search
      select: '-password'
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

    const name = req.query.query;
    const found_user = await User.findOne({ _id: req.user._id }).populate({
      path: 'friends',
      match: { $or: [
        { first_name: { $regex: name, $options: 'i' } }, 
        { last_name: { $regex: name, $options: 'i' } },
        { full_name: { $regex: name, $options: 'i' } },
      ]}, // Case-insensitive search by first or last name
      select: '-password'
    });

    res.status(200).json(found_user.friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editMyProfile,
  createUser,
  findMe,
  getUser,
  getUserFriendByEmailSearch,
  getUserFriendByNameSearch,
 };
