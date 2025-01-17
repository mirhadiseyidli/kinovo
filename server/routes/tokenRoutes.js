const express = require('express');
const jwt = require('jsonwebtoken');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { tokenMiddleware } = require('../utils/tokenMiddleware');

const router = express.Router();

// Refresh Access Token using a valid Refresh Token
router.post('/refresh-token', tokenMiddleware, (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    // Generate a new access token
    const newAccessToken = generateAccessToken({
      _id: decoded._id,
      email: decoded.email,
      role: decoded.role,
    });

    res.status(200).json({ accessToken: newAccessToken });
  });
});

module.exports = router;