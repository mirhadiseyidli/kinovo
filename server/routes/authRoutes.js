// const express = require('express');
// const passport = require('passport');
// const { generateAccessToken, generateRefreshToken } = require('../utils/token');

// const router = express.Router();

// // Initiate Google OAuth
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// // Handle the OAuth callback
// router.get('/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login', session: true }),
//   (req, res) => {
//     const user = req.user;
//     console.log(user)
//     const accessToken = generateAccessToken({ _id: user._id, google_id: user.google_id, email: user.email, role: user.role });
//     const refreshToken = generateRefreshToken({ _id: user._id, google_id: user.id, email: user.email, role: user.role });

//     // Send tokens to the client
//     res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
//     res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
//     const redirectUrl = `myapp://login?accessToken=${accessToken}&refreshToken=${refreshToken}`;
//     res.redirect(redirectUrl); // Use deep link for React Native
//   }
// );

// // Logout route
// router.get('/logout', (req, res, next) => {
//   req.logout(function(err) {
//     if (err) {
//       return next(err); // Pass the error to the next middleware for handling
//     }
//     req.session.destroy((err) => {
//       if (err) {
//         return next(err);
//       }
//       // Clear cookies
//       res.clearCookie('XSRF-TOKEN'); 
//       res.clearCookie('accessToken');
//       res.clearCookie('refreshToken');
//       res.redirect('myapp://logout'); // Redirect to the login page after logout
//     });
//   });
// });

// module.exports = router;

const express = require('express');
const { verifyIdToken } = require('../utils/googleAuth');
const User = require('../database/schemas/usersSchema');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const bcrypt = require('bcrypt');
const logger = require('winston'); // Optional for logging
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
    const profilePicture = payload.picture;

    // Find or create the user in your database
    let user = await User.findOne({ google_id: userId });
    if (!user) {
      logger.info(`Creating new user for Google ID: ${userId}`);
      user = await User.create({
        first_name: firstName,
        last_name: lastName,
        username: email,
        email: email,
        google_id: userId,
        profile_picture: profilePicture || null,
      });
    }

    const userDataFromDB = await User.findOne({ google_id: userId }).select('-password');

    // Generate Access and Refresh Tokens
    const accessToken = generateAccessToken({ id: userDataFromDB.user_id, email: user.email });
    const refreshToken = generateRefreshToken({ id: userDataFromDB.user_id, email: user.email });

    // Respond with user info and tokens
    res.json({
      success: true,
      user: {
        id: userDataFromDB.user_id,
        email: userDataFromDB.email,
        first_name: userDataFromDB.first_name,
        last_name: userDataFromDB.last_name,
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
    const accessToken = generateAccessToken({ id: user.user_id, email: user.email });
    const refreshToken = generateRefreshToken({ id: user.user_id, email: user.email });

    // Respond with user info and tokens
    return res.json({
      success: true,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
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
    const accessToken = generateAccessToken({ id: userDataFromDB.user_id, email: userDataFromDB.email });
    const refreshToken = generateRefreshToken({ id: userDataFromDB.user_id, email: userDataFromDB.email });

    return res.status(200).json({
      success: true,
      user: {
        id: userDataFromDB.user_id,
        email: userDataFromDB.email,
        first_name: userDataFromDB.first_name,
        last_name: userDataFromDB.last_name,
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