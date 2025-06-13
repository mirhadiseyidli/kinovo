const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.accessToken;

  if (!token) {

    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // Attach decoded user info to `req.user`
    next();
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    // Return 401 (not 403) to trigger token refresh on client
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired access token' });
  }
};

module.exports = { authMiddleware };