const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateAccessToken(user) {
  return jwt.sign(user, process.env.JWT_API_SECRET, { expiresIn: '1h' });
}

function generateRefreshToken(user) {
  return jwt.sign(user, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_API_SECRET); // Verify token using JWT_API_SECRET
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken };