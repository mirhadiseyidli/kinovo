const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const {
  googleAuth,
  login,
  signup,
  refreshToken,
  getPhoneNumber,
  verifyLogin,
  verifyPhone,
  verifyPassword,
  verifyCurrentPassword,
  changePassword,
  verifyPasswordForEmail,
  changeEmail,
  changePhone,
  checkPhone,
  changeUsername,
  reactivateAccount
} = require('../controllers/authController');
const { tokenMiddleware } = require('../utils/tokenMiddleware');
const router = express.Router();

// Public authentication routes (pre-login/signup)
router.post('/google-auth', googleAuth);
router.post('/login', login);
router.post('/signup', signup);
router.post('/refresh-token', tokenMiddleware, refreshToken);
router.post('/verify-login', verifyLogin);

// Public phone verification routes (used during signup)
router.post('/verify-phone', verifyPhone);
router.post('/check-phone', checkPhone);

// Dual-use routes (both public and protected versions)
router.post('/get-phone', getPhoneNumber); // Public version for login/2FA
router.post('/get-phone/protected', authMiddleware, getPhoneNumber); // Protected version for logged-in users

router.post('/reactivate-account', reactivateAccount); // Public version during login
router.post('/reactivate-account/protected', authMiddleware, reactivateAccount); // Protected version for logged-in users

// Protected routes (require authentication)
router.post('/verify-password', authMiddleware, verifyPassword);
router.post('/verify-current-password', authMiddleware, verifyCurrentPassword);
router.post('/change-password', authMiddleware, changePassword);
router.post('/verify-password-for-email', authMiddleware, verifyPasswordForEmail);
router.post('/change-email', authMiddleware, changeEmail);
router.post('/change-phone', authMiddleware, changePhone);
router.post('/change-username', authMiddleware, changeUsername);

module.exports = router;