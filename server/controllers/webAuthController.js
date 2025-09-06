const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../database/schemas/usersSchema');
const { generateAccessToken, generateRefreshToken, verifyAccessToken } = require('../utils/token');
// Use console for logging instead of logger
const UserNotificationPreferences = require('../database/schemas/userNotificationPreferencesSchema');


const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

/**
 * Web-specific Google OAuth authentication with httpOnly cookies
 */
const webGoogleAuth = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ 
      success: false, 
      message: 'ID token is required' 
    });
  }

  try {
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let userDataFromDB = await User.findOne({ email });

    if (!userDataFromDB) {
      // Create new user
      userDataFromDB = await User.create({
        email,
        name,
        profile_picture: picture,
        googleId,
        provider: 'google',
        isEmailVerified: true,
        role: 'user' // Default role
      });

      await createNotificationPreferences(userDataFromDB._id);
    }

    // Check if user has admin role
    if (userDataFromDB.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ 
      _id: userDataFromDB._id, 
      email: userDataFromDB.email 
    });
    
    const refreshToken = generateRefreshToken({ 
      _id: userDataFromDB._id, 
      email: userDataFromDB.email 
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Allow for OAuth redirects
      domain: process.env.NODE_ENV === 'production' ? '.kinovo.app' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Send response with access token only
    res.json({
      success: true,
      user: {
        id: userDataFromDB._id,
        email: userDataFromDB.email,
        name: userDataFromDB.name,
        profile_picture: userDataFromDB.profile_picture,
        role: userDataFromDB.role,
      },
      accessToken // Only access token in response, refresh token is in cookie
    });

  } catch (error) {
    console.error('Error in web Google auth:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid Google token' 
    });
  }
};

/**
 * Web-specific token refresh using httpOnly cookie
 */
const webRefreshToken = async (req, res) => {
  // Try to get refresh token from cookie first
  let refreshToken = req.cookies.refreshToken;
  
  // For NextAuth compatibility: Accept access token for refresh if no refresh token
  // This is secure because we verify the token and check admin role
  if (!refreshToken) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader && authHeader.split(' ')[1];
    
    if (accessToken) {
      try {
        // Verify the access token
        const decoded = verifyAccessToken(accessToken);
        
        // Check if user is admin
        const user = await User.findById(decoded._id).select('role email');
        if (user && user.role === 'admin') {
          // Generate new tokens for admin user
          const newAccessToken = generateAccessToken({
            _id: decoded._id,
            email: decoded.email,
          });
          
          const newRefreshToken = generateRefreshToken({
            _id: decoded._id,
            email: decoded.email,
          });
          
          // Set refresh token as httpOnly cookie for future requests
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.kinovo.app' : 'localhost',
            maxAge: 7 * 24 * 60 * 60 * 1000
          });
          
          return res.json({ 
            success: true,
            accessToken: newAccessToken 
          });
        }
      } catch (error) {
        console.log('Access token verification failed:', error.message);
      }
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Refresh token required' 
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      _id: decoded._id,
      email: decoded.email,
    });

    // Optionally rotate refresh token for better security
    const newRefreshToken = generateRefreshToken({
      _id: decoded._id,
      email: decoded.email,
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.kinovo.app' : 'localhost',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true,
      accessToken: newAccessToken 
    });

  } catch (error) {
    console.error('Error verifying refresh token:', error);
    
    // Clear invalid cookie
    res.clearCookie('refreshToken');
    
    return res.status(403).json({ 
      success: false,
      message: 'Invalid or expired refresh token' 
    });
  }
};

/**
 * Web-specific logout - clear httpOnly cookies
 */
const webLogout = async (req, res) => {
  res.clearCookie('refreshToken', {
    domain: process.env.NODE_ENV === 'production' ? '.kinovo.app' : 'localhost',
  });
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
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
  webGoogleAuth,
  webRefreshToken,
  webLogout
};