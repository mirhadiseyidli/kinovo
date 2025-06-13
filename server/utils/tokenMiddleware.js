const jwt = require('jsonwebtoken');
require('dotenv').config();

const tokenMiddleware = (req, res, next) => {

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('No token provided in authorization header');
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

module.exports = { tokenMiddleware };