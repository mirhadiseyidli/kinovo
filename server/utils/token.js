const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateAccessToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1m' }); // 15 minutes for better testing
}

function generateRefreshToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '180d' }); // 180 days
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw new Error('Invalid or expired access token');
  }
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken };