const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  console.log('--------------------------------');
  console.log('Auth middleware triggered for path:', req.originalUrl);
  console.log('Auth headers:', req.headers.authorization);
  console.log('--------------------------------');
  
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.accessToken;

  if (!token) {
    console.log('No access token provided in request');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    console.log('Verifying access token...');
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log('Access token valid for user:', decoded._id);
    req.user = decoded; // Attach decoded user info to `req.user`
    next();
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    // Return 401 (not 403) to trigger token refresh on client
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired access token' });
  }
};

module.exports = { authMiddleware };