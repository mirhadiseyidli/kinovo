const bcrypt = require('bcrypt');
const User = require('../database/schemas/usersSchema');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { verifyIdToken } = require('../utils/googleAuth');
const admin = require('../config/firebase-admin');
const jwt = require('jsonwebtoken');
const logger = require('winston');

// Helper functions
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

const checkPassword = (password, hash) => bcrypt.compare(password, hash);

// Auth Controller Functions
const googleAuth = async (req, res) => {
  console.log('Google Auth Request:', req.body);
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'No token provided' });
  }

  try {
    const { userId, email, name, payload } = await verifyIdToken(idToken);
    logger.info(`Google Token Verified for user ID: ${userId}`);

    const firstName = payload.given_name || 'FirstName';
    const lastName = payload.family_name || 'LastName';
    const fullName = `${payload.given_name} ${payload.family_name}` || 'Full Name'
    const profilePicture = payload.picture;
    const email_verified = payload.email_verified;

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
    const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: user.email });

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
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found! Please Sign Up to create an Account!',
      });
    }

    const isPasswordValid = await checkPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password! Please try again!',
      });
    }

    if (user.delete_requested) {
      return res.json({
        success: true,
        isMarkedForDeletion: true,
        message: 'Account is marked for deletion'
      });
    }

    const accessToken = generateAccessToken({ _id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

    return res.json({
      success: true,
      isMarkedForDeletion: false,
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
};

const signup = async (req, res) => {
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

    if (!first_name || !last_name || !email || !password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    let existingUser = await User.findOne({ email }).select('-password');
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists, please try to log in'
      });
    }

    const hashedPassword = await hashPassword(password);
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
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newAccessToken = generateAccessToken({
      _id: decoded._id,
      email: decoded.email,
    });

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

const getPhoneNumber = async (req, res) => {
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
};

const verifyLogin = async (req, res) => {
  const { email, verificationId, verificationCode } = req.body;

  if (!email || !verificationId || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'Email, verification ID and code are required'
    });
  }

  try {
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const customToken = await admin.auth().createCustomToken(user._id.toString());
    const accessToken = generateAccessToken({ _id: user._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: user._id, email: user.email });

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
      refreshToken,
      firebaseToken: customToken
    });
  } catch (error) {
    console.error('Error verifying login:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const verifyPhone = async (req, res) => {
  const { verificationId, verificationCode, phoneNumber, email, password } = req.body;

  if (!verificationId || !verificationCode || !phoneNumber || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanedPhone.length === 10 ? `+1${cleanedPhone}` : phoneNumber;

    const phoneExists = await User.findOne({ 'phone_number.full_num': formattedPhone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }

    return res.json({
      success: true,
      message: 'Phone verification successful',
      phoneNumber: formattedPhone
    });
  } catch (error) {
    console.error('Error in verify-phone:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const verifyPassword = async (req, res) => {
  try {
    const { password, email } = req.body;
    
    // Find the user by email if provided, otherwise use ID from auth middleware
    const user = email 
      ? await User.findOne({ email })
      : await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If it's a Google account, they don't have a password
    if (user.google_id) {
      return res.status(400).json({ message: 'Google accounts do not have a password' });
    }

    // Verify the password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    res.status(200).json({ message: 'Password verified' });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyCurrentPassword = async (req, res) => {
  const { email, currentPassword } = req.body;

  if (!email || !currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email and current password are required'
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

    const isPasswordValid = await checkPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    return res.json({
      success: true,
      phoneNumber: user.phone_number?.full_num || null
    });
  } catch (error) {
    console.error('Error verifying current password:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const changePassword = async (req, res) => {
  const { email, newPassword, verificationId, verificationCode } = req.body;

  if (!email || !newPassword || !verificationId || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
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

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await user.save();

    return res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const verifyPasswordForEmail = async (req, res) => {
  const { email, currentPassword } = req.body;

  if (!email || !currentPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email and current password are required'
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

    const isPasswordValid = await checkPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    return res.json({
      success: true,
      phoneNumber: user.phone_number?.full_num || null
    });
  } catch (error) {
    console.error('Error verifying password for email change:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const changeEmail = async (req, res) => {
  const { currentEmail, newEmail, verificationId, verificationCode } = req.body;

  if (!currentEmail || !newEmail || !verificationId || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }

    const user = await User.findOne({ email: currentEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.email = newEmail;
    await user.save();

    return res.json({
      success: true,
      message: 'Email updated successfully'
    });
  } catch (error) {
    console.error('Error changing email:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const changePhone = async (req, res) => {
  const { currentPhoneNumber, newPhoneNumber, verificationId, verificationCode } = req.body;

  if (!currentPhoneNumber || !newPhoneNumber || !verificationId || !verificationCode) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    const cleanedNewPhone = newPhoneNumber.replace(/\D/g, '');
    const formattedNewPhone = cleanedNewPhone.length === 10 ? `+1${cleanedNewPhone}` : newPhoneNumber;

    const phoneExists = await User.findOne({ 'phone_number.full_num': formattedNewPhone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }

    const user = await User.findOne({ 'phone_number.full_num': currentPhoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.phone_number = {
      full_num: formattedNewPhone,
    };
    await user.save();

    return res.json({
      success: true,
      message: 'Phone number updated successfully'
    });
  } catch (error) {
    console.error('Error changing phone number:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const checkPhone = async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      message: 'Phone number is required'
    });
  }

  try {
    const phoneExists = await User.findOne({ 'phone_number.full_num': phoneNumber });
    
    return res.json({
      success: true,
      exists: !!phoneExists
    });
  } catch (error) {
    console.error('Error checking phone number:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const changeUsername = async (req, res) => {
  const { currentUsername, newUsername } = req.body;

  if (!currentUsername || !newUsername) {
    return res.status(400).json({
      success: false,
      message: 'Current and new username are required'
    });
  }

  try {
    const usernameExists = await User.findOne({ username: newUsername });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    const user = await User.findOne({ username: currentUsername });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.username = newUsername;
    await user.save();

    return res.json({
      success: true,
      message: 'Username updated successfully'
    });
  } catch (error) {
    console.error('Error changing username:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const reactivateAccount = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { 
        $set: { 
          delete_requested: false,
          deleted_at: null
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    console.error('Account reactivation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reactivate account. Please try again later.'
    });
  }
};

module.exports = {
  googleAuth,
  login,
  signup,
  refreshToken,
  getPhoneNumber,
  verifyLogin,
  verifyPhone,
  verifyPassword,
  verifyCurrentPassword,
  changePassword,
  verifyPasswordForEmail,
  changeEmail,
  changePhone,
  checkPhone,
  changeUsername,
  reactivateAccount
}; 