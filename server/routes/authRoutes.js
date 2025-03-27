const express = require('express');
const { verifyIdToken } = require('../utils/googleAuth');
const User = require('../database/schemas/usersSchema');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const bcrypt = require('bcrypt');
const logger = require('winston'); // Optional for logging
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const router = express.Router();

// POST: Verify Google ID Token and Authenticate User
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'No token provided' });
  }

  try {
    // Use the utility function to verify the ID token
    const { userId, email, name, payload } = await verifyIdToken(idToken);

    logger.info(`Google Token Verified for user ID: ${userId}`);

    const firstName = payload.given_name || 'FirstName';
    const lastName = payload.family_name || 'LastName';
    const fullName = `${payload.given_name} ${payload.family_name}` || 'Full Name'
    const profilePicture = payload.picture;
    const email_verified = payload.email_verified;

    // Find or create the user in your database
    let user = await User.findOne({ google_id: userId });
    if (!user) {
      logger.info(`Creating new user for Google ID: ${userId}`);
      user = await User.create({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        username: email,
        email: email,
        email_verified: email_verified,
        google_id: userId,
        profile_picture: profilePicture || null,
      });
    }

    const userDataFromDB = await User.findOne({ google_id: userId }).select('-password');
    console.log(userDataFromDB)

    // Generate Access and Refresh Tokens
    const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: user.email });

    // Respond with user info and tokens
    res.json({
      success: true,
      user: {
        _id: userDataFromDB._id,
        email: userDataFromDB.email,
        first_name: userDataFromDB.first_name,
        last_name: userDataFromDB.last_name,
        full_name: userDataFromDB.full_name,
        profile_picture: userDataFromDB.profile_picture,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    logger.error('Error verifying Google token:', err.message);
    res.status(401).json({ success: false, message: 'Invalid Google ID token' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found! Please Sign Up to create an Account!',
      });
    }

    // Validate the password
    const isPasswordValid = await checkPassword(password, user.password); // Assumes `checkPassword` handles hashing/salting
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password! Please try again!',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ _id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

    // Respond with user info and tokens
    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        profile_picture: user.profile_picture,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.',
    });
  }
});

router.post('/signup', async (req, res) => {

  const { firstName, lastName, email, password } = req.body

  const hashedPassword = await hashPassword(password)

  let existingUser = await User.findOne({ email: email }).select('-password');

  if(existingUser) {
    return res.status(400).json({
      message: 'Email already exists, please try to log in'
    })
  };

  if (!existingUser) {
    existingUser = await User.create({
      first_name: firstName,
      last_name: lastName,
      username: email,
      email: email,
      password: hashedPassword,
      profile_picture: null,
    });
  };

  const userDataFromDB = await User.findOne({ email: email  }).select('-password');

  if(userDataFromDB) {
    const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: userDataFromDB.email });
    const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: userDataFromDB.email });

    return res.status(200).json({
      success: true,
      user: {
        _id: userDataFromDB._id,
        email: userDataFromDB.email,
        first_name: userDataFromDB.first_name,
        last_name: userDataFromDB.last_name,
        full_name: `${userDataFromDB.first_name} ${userDataFromDB.last_name}`,
        profile_picture: userDataFromDB.profile_picture,
      },
      accessToken,
      refreshToken,
    })
  }
});

const hashPassword = password => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if(err) reject(err)
      bcrypt.hash(password, salt, (err, hash) => {
        if(err) reject(err)
        resolve(hash)
      })
    })
  })
}

const checkPassword = (password, hash) => bcrypt.compare(password, hash)

module.exports = router;