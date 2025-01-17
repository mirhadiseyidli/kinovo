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

const deleteUsers = (getUser, async (req, res) => {
  let user;
  try {
    user = await User.deleteOne({ _id: res.user.id }).select('-password_hash');
    res.status(200).json('Deleted the user');
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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

      const userId = req.user._id;
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
  } catch (error) {
      res.status(500).json({ message: 'Server error' });
  }
};

async function getUser(req, res, next) {
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

module.exports = { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editUser,
  createUser,
  findMe,
  getUser
};

// POST /api/users/signup
// 	•	Create a new user account.
// 	•	Body: { "name": "", "email": "", "password": "" }
// 	2.	POST /api/users/login
// 	•	Authenticate a user and generate a session token.
// 	•	Body: { "email": "", "password": "" }
// 	3.	GET /api/users/profile
// 	•	Retrieve the current user’s profile.
// 	•	Headers: Authorization: Bearer <token>
// 	4.	PUT /api/users/profile
// 	•	Update the user’s profile (e.g., name, profile picture).
// 	•	Body: { "name": "", "profile_picture_url": "" }
// 	5.	POST /api/users/logout
// 	•	End the current user’s session.
// 	•	Headers: Authorization: Bearer <token>
