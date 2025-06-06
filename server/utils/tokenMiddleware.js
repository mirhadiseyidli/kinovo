const jwt = require('jsonwebtoken');
require('dotenv').config();

const tokenMiddleware = (req, res, next) => {
  console.log('--------------------------------');
  console.log('Token middleware request headers:', req.headers);
  console.log('--------------------------------');
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('No token provided in authorization header');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    console.log('Token verified successfully for user:', decoded._id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

module.exports = { tokenMiddleware };