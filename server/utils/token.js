const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateAccessToken(user) {
  console.log(user)
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_API_SECRET, { expiresIn: '24h' }); // should be 1 hr
}

function generateRefreshToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '180d' }); // should be 7 days or 30 days
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_API_SECRET); // Verify token using JWT_API_SECRET
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken };