const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateAccessToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' }); // should be 5 mins
}

function generateRefreshToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '180d' }); // should be 180 days
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET); // Verify token using JWT_API_SECRET
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken };