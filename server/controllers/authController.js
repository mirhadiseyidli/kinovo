const bcrypt = require('bcrypt');
const User = require('../database/schemas/usersSchema');
const UserContacts = require('../database/schemas/userContactsSchema');
const UserNotificationPreferences = require('../database/schemas/userNotificationPreferencesSchema');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { verifyIdToken } = require('../utils/googleAuth');
const { admin } = require('../config/firebase-admin');
const jwt = require('jsonwebtoken');
const logger = require('winston');
const { verifyIdentityToken } = require('../utils/appleAuth');
const { createContactJoinedNotification } = require('./notificationsController');
const { createDefaultProfileImage } = require('./userController');

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
      
      // Generate default profile image if none provided
      let finalProfilePicture = profilePicture;
      if (!profilePicture && firstName && lastName) {
        try {
          finalProfilePicture = await createDefaultProfileImage(firstName, lastName);
        } catch (error) {
          console.error('Error creating default profile image:', error);
          finalProfilePicture = null;
        }
      }
      
      user = await User.create({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        username: email,
        email: email,
        email_verified: email_verified,
        google_id: userId,
        profile_picture: finalProfilePicture,
      });

      // Check if any existing users have this user's phone number in their contacts
      // Note: Google doesn't provide phone number directly, so this is for future enhancement
      // when user adds phone number later
    }

    const userDataFromDB = await User.findOne({ google_id: userId }).select('-password');
    if (!userDataFromDB) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await createNotificationPreferences(userDataFromDB._id);

    const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: user.email });
    const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: user.email });
    const customToken = await admin.auth().createCustomToken(userDataFromDB._id.toString());

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
      firebaseToken: customToken
    });
  } catch (err) {
    logger.error('Error verifying Google token:', err);
    res.status(401).json({ success: false, message: 'Invalid Google ID token' });
  }
};

// Add this controller function
const appleAuth = async (req, res) => {
  const { identityToken, user } = req.body;

  if (!identityToken) {
    return res.status(400).json({ success: false, message: 'No token provided' });
  }

  try {
    const { userId, email, email_verified, payload } = await verifyIdentityToken(identityToken);
    logger.info(`Apple Token Verified for user ID: ${userId}`);

    // Apple might not return these details every time, so we need to handle that
    const firstName = user?.fullName?.givenName || 'FirstName';
    const lastName = user?.fullName?.familyName || 'LastName';
    const fullName = `${firstName} ${lastName}`;
    
    // For Apple, email may only be provided on the first login
    const userEmail = email || user?.email;
    
    if (!userEmail) {
      // You can either use a fallback email or return an error
      return res.status(400).json({ success: false, message: 'Email is required for account creation' });
    }

    let existingUser = await User.findOne({ apple_id: userId });
    
    // If no user with apple_id, check if email exists
    if (!existingUser && userEmail) {
      existingUser = await User.findOne({ email: userEmail });
      
      // If user exists with this email but no apple_id, link the accounts
      if (existingUser) {
        existingUser.apple_id = userId;
        await existingUser.save();
      }
    }

    if (!existingUser) {
      logger.info(`Creating new user for Apple ID: ${userId}`);
      
      // For testing purpose, use default values if needed
      const finalEmail = userEmail || `apple_${userId}@example.com`;
      
      // Generate default profile image
      let defaultProfileImage = null;
      if (firstName && lastName) {
        try {
          defaultProfileImage = await createDefaultProfileImage(firstName, lastName);
        } catch (error) {
          console.error('Error creating default profile image:', error);
        }
      }
      
      existingUser = await User.create({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        username: finalEmail,
        email: finalEmail,
        email_verified: true, // Apple verifies emails
        apple_id: userId,
        profile_picture: defaultProfileImage,
      });
    }

    await createNotificationPreferences(existingUser._id);

    const accessToken = generateAccessToken({ _id: existingUser._id, email: existingUser.email });
    const refreshToken = generateRefreshToken({ _id: existingUser._id, email: existingUser.email });
    const customToken = await admin.auth().createCustomToken(existingUser._id.toString());

    res.json({
      success: true,
      user: {
        _id: existingUser._id,
        email: existingUser.email,
        first_name: existingUser.first_name,
        last_name: existingUser.last_name,
        full_name: existingUser.full_name,
        profile_picture: existingUser.profile_picture,
      },
      accessToken,
      refreshToken,
      firebaseToken: customToken
    });
  } catch (err) {
    console.error('Error in Apple auth:', err);
    logger.error('Error verifying Apple token:', err.message);
    res.status(401).json({ success: false, message: 'Invalid Apple ID token: ' + err.message });
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
    const customToken = await admin.auth().createCustomToken(user._id.toString());

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
      firebaseToken: customToken
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
    
    // Generate default profile image
    let defaultProfileImage = null;
    if (first_name && last_name) {
      try {
        defaultProfileImage = await createDefaultProfileImage(first_name, last_name);
      } catch (error) {
        console.error('Error creating default profile image:', error);
      }
    }
    
    const newUser = await User.create({
      first_name,
      last_name,
      full_name,
      username: email,
      email,
      password: hashedPassword,
      date_of_birth,
      phone_number,
      profile_picture: defaultProfileImage,
    });

    const userDataFromDB = await User.findOne({ email }).select('-password');
    if (userDataFromDB) {
      // Check if any existing users have this phone number in their contacts
      if (phone_number?.full_num) {
        try {
          const contactOwners = await UserContacts.find({ 
            phoneNumber: phone_number.full_num 
          }).distinct('user');
          
          if (contactOwners.length > 0) {
            await createContactJoinedNotification(userDataFromDB._id, contactOwners);
          }
        } catch (contactError) {
          console.error('Error sending contact joined notifications:', contactError);
          // Don't fail signup if notification fails
        }
      }

      await createNotificationPreferences(userDataFromDB._id);

      const accessToken = generateAccessToken({ _id: userDataFromDB._id, email: userDataFromDB.email });
      const refreshToken = generateRefreshToken({ _id: userDataFromDB._id, email: userDataFromDB.email });
      const customToken = await admin.auth().createCustomToken(userDataFromDB._id.toString());

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
        firebaseToken: customToken
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

  const refreshToken = req.headers.authorization?.split(' ')[1];

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
    console.error('Error verifying refresh token:', err);
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
    logger.error('Error reactivating account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate account'
    });
  }
};

// Password Reset Functions
const resetPasswordRequest = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }

    // Generate 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store reset code in user document
    user.reset_password_code = resetCode;
    user.reset_password_expires = resetCodeExpiry;
    await user.save();

    // Send email with reset code
    const { sendEmail } = require('../utils/emailService');
    const { passwordResetEmailTemplate } = require('../utils/emailTemplates');
    
    await sendEmail({
      to: email,
      subject: 'Password Reset Code - Kinovo',
      html: passwordResetEmailTemplate(user.first_name || 'User', resetCode)
    });

    logger.info(`Password reset code sent to: ${email}`);
    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    logger.error('Error sending password reset code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset code'
    });
  }
};

const verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ 
      email,
      reset_password_code: code,
      reset_password_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    res.json({
      success: true,
      message: 'Verification code is valid'
    });
  } catch (error) {
    logger.error('Error verifying reset code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset code'
    });
  }
};

const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await User.findOne({ 
      email,
      reset_password_code: code,
      reset_password_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password and clear reset fields
    user.password = hashedPassword;
    user.reset_password_code = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    logger.info(`Password reset completed for user: ${email}`);
    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

const createNotificationPreferences = async (userId) => {
  // ✅ Check if user already has preferences
  const existing = await UserNotificationPreferences.findOne({ user: userId });
  if (existing) return existing;

  // ✅ If not, create with default settings
  const defaults = {
    user: userId,
    notification_preferences: {
      inApp: {
        friend_request_accepted: true,
        event_reminder_10_mins: true,
        event_reminder_1_hour: true,
        event_updated: true,
        new_event_nearby: true,
        event_attendance_confirmed: true,
        new_event_from_friend: true,
        event_invitation: true,
        someone_from_contacts_joined: true
      },
      email: {
        friend_request_accepted: false,
        event_reminder_10_mins: true,
        event_reminder_1_hour: true,
        event_updated: false,
        new_event_nearby: false,
        event_attendance_confirmed: false,
        new_event_from_friend: false,
        event_invitation: false,
        someone_from_contacts_joined: false
      },
      push: {
        friend_request_accepted: true,
        event_reminder_10_mins: true,
        event_reminder_1_hour: true,
        event_updated: true,
        new_event_nearby: true,
        event_attendance_confirmed: true,
        new_event_from_friend: true,
        event_invitation: true,
        someone_from_contacts_joined: true
      }
    }
  };

  const created = await UserNotificationPreferences.create(defaults);
  return created;
};

module.exports = {
  googleAuth,
  appleAuth,
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
  reactivateAccount,
  resetPasswordRequest,
  verifyResetCode,
  resetPassword
}; 