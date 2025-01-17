const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_API_SECRET);
    req.user = decoded; // Attach decoded user info to `req.user`
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Unauthorized: Invalid or expired access token' });
  }
};

// Role-based access control middleware
const checkRole = (roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) {
    return next();
  } else {
    return res.status(403).json({ message: 'Permission denied' });
  }
};

module.exports = { authMiddleware, checkRole };