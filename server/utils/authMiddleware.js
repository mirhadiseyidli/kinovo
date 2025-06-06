const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  console.log('authMiddleware', req.headers);
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // Attach decoded user info to `req.user`
    console.log('decoded', decoded);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Unauthorized: Invalid or expired access token' });
  }
};

module.exports = { authMiddleware };