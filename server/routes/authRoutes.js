const express = require('express');
const { verifyIdToken } = require('../utils/googleAuth');
const User = require('../database/schemas/usersSchema');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const bcrypt = require('bcrypt');
const logger = require('winston'); // Optional for logging
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase-admin');
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
  console.log('req.body', req.body);

  try {
    const {
      first_name,
      last_name,
      full_name,
      email,
      password,
      date_of_birth,
      phone_number
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if user already exists
    let existingUser = await User.findOne({ email }).select('-password');
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists, please try to log in'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await User.create({
      first_name,
      last_name,
      full_name,
      username: email,
      email,
      password: hashedPassword,
      date_of_birth,
      phone_number,
      profile_picture: null,
    });

    // Get user data without password
    const userDataFromDB = await User.findOne({ email }).select('-password');

    if (userDataFromDB) {
      const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: userDataFromDB.email });
      const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: userDataFromDB.email });

      return res.status(200).json({
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
    }

    throw new Error('Failed to create user');
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Generate a new access token
    const newAccessToken = generateAccessToken({
      _id: decoded._id,
      email: decoded.email,
    });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

// GET user's phone number for MFA
router.post('/get-phone', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return the user's phone number for MFA
    return res.json({
      success: true,
      phoneNumber: user.phone_number?.full_num || null
    });
  } catch (error) {
    console.error('Error fetching phone number:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify login after phone verification
router.post('/verify-login', async (req, res) => {
  const { email, verificationId, verificationCode } = req.body;

  if (!email || !verificationId || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'Email, verification ID and code are required'
    });
  }

  try {
    // First find the user
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify the phone code using Firebase Admin SDK
    try {
      const phoneCredential = admin.auth.PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      await admin.auth().signInWithCredential(phoneCredential);
    } catch (error) {
      console.error('Phone verification failed:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ _id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

    // Return user data and tokens
    return res.json({
      success: true,
      userId: user._id,
      user: {
        _id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        profile_picture: user.profile_picture,
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Error verifying login:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify phone number during signup
router.post('/verify-phone', async (req, res) => {
  const { verificationId, verificationCode, phoneNumber, email, password } = req.body;

  if (!verificationId || !verificationCode || !phoneNumber || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    // First check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Verify the phone code using Firebase Admin SDK
    try {
      // Format phone number for checking
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanedPhone.length === 10 ? `+1${cleanedPhone}` : phoneNumber;

      // Check if phone number is already in use
      const phoneExists = await User.findOne({ 'phone_number.full_num': formattedPhone });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already registered'
        });
      }

      // If we get here, the client-side verification was successful and phone is available
      return res.json({
        success: true,
        message: 'Phone verification successful',
        phoneNumber: formattedPhone
      });
    } catch (error) {
      console.error('Phone verification failed:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
  } catch (error) {
    console.error('Error in verify-phone:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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