const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const {
  googleAuth,
  appleAuth,
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
  reactivateAccount,
  resetPasswordRequest,
  verifyResetCode,
  resetPassword
} = require('../controllers/authController');
const {
  sendTwoFactorCode,
  verifyTwoFactorCode,
  checkTwoFactorStatus,
  cleanupExpiredCodes
} = require('../controllers/twoFactorController');

// Import web-specific auth controllers
const {
  webGoogleAuth,
  webRefreshToken,
  webLogout
} = require('../controllers/webAuthController');
const { tokenMiddleware } = require('../utils/tokenMiddleware');
const router = express.Router();

// Public authentication routes (pre-login/signup) - Mobile
router.post('/google-auth', googleAuth);
router.post('/apple-auth', appleAuth);
router.post('/login', login);
router.post('/signup', signup);
router.post('/refresh-token', tokenMiddleware, refreshToken);
router.post('/verify-login', verifyLogin);

// Web-specific authentication routes with httpOnly cookies
router.post('/web/google-auth', webGoogleAuth);
router.post('/web/refresh-token', webRefreshToken);
router.post('/web/logout', webLogout);

// Public phone verification routes (used during signup)
router.post('/verify-phone', verifyPhone);
router.post('/check-phone', checkPhone);

// Password reset routes (public)
router.post('/reset-password-request', resetPasswordRequest);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Two-Factor Authentication routes (public)
router.post('/2fa/send', sendTwoFactorCode);
router.post('/2fa/verify', verifyTwoFactorCode);
router.get('/2fa/status', checkTwoFactorStatus);
router.delete('/2fa/cleanup', cleanupExpiredCodes); // Optional maintenance endpoint

// Dual-use routes (both public and protected versions)
router.post('/check-phone/protected', authMiddleware, checkPhone);
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