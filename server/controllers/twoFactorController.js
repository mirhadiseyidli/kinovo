const TwoFactor = require('../database/schemas/twoFactorSchema');
const User = require('../database/schemas/usersSchema');
const { sendEmail } = require('../utils/emailService');
const { twoFactorAuthEmailTemplate } = require('../utils/emailTemplates');
const crypto = require('crypto');

/**
 * Generate and send 2FA code via email
 * @route POST /api/auth/2fa/send
 */
const sendTwoFactorCode = async (req, res) => {
  try {
    const { email, userId } = req.body;

    // Validate input
    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Email or userId is required'
      });
    }

    // Find user by email or userId
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if there's an existing valid code
    const existingCode = await TwoFactor.findOne({
      user: user._id,
      expires_at: { $gt: new Date() },
      verified: false
    });

    if (existingCode) {
      // Check if we need to rate limit (e.g., allow resend only after 30 seconds)
      const timeSinceCreation = Date.now() - existingCode.created_at.getTime();
      if (timeSinceCreation < 30000) { // 30 seconds
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting a new code',
          waitTime: Math.ceil((30000 - timeSinceCreation) / 1000)
        });
      }
      
      // Delete the existing code to create a new one
      await TwoFactor.deleteOne({ _id: existingCode._id });
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    
    // Set expiration time (1 minute from now)
    const expiresAt = new Date(Date.now() + 60 * 1000);

    // Save code to database
    const twoFactorEntry = new TwoFactor({
      user: user._id,
      email: user.email,
      code,
      expires_at: expiresAt,
      attempts: 0,
      verified: false
    });

    await twoFactorEntry.save();

    // Send email with code
    await sendEmail({
      to: user.email,
      subject: 'Your Kinovo Verification Code',
      html: twoFactorAuthEmailTemplate(user.first_name || 'User', code)
    });

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: 60 // seconds
    });

  } catch (error) {
    console.error('Error sending 2FA code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification code'
    });
  }
};

/**
 * Verify 2FA code
 * @route POST /api/auth/2fa/verify
 */
const verifyTwoFactorCode = async (req, res) => {
  try {
    const { email, userId, code } = req.body;

    // Validate input
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Email or userId is required'
      });
    }

    // Find user
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find the code entry
    const twoFactorEntry = await TwoFactor.findOne({
      user: user._id,
      code: code.toString(),
      expires_at: { $gt: new Date() },
      verified: false
    });

    if (!twoFactorEntry) {
      // Check if there's an expired code or code with too many attempts
      const anyEntry = await TwoFactor.findOne({
        user: user._id,
        verified: false
      }).sort({ created_at: -1 });

      if (anyEntry) {
        // Increment attempts
        anyEntry.attempts += 1;
        await anyEntry.save();

        // Check if too many attempts
        if (anyEntry.attempts >= 5) {
          await TwoFactor.deleteMany({ user: user._id, verified: false });
          return res.status(429).json({
            success: false,
            message: 'Too many failed attempts. Please request a new code.'
          });
        }

        if (anyEntry.expires_at < new Date()) {
          return res.status(400).json({
            success: false,
            message: 'Verification code has expired'
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Mark code as verified
    twoFactorEntry.verified = true;
    await twoFactorEntry.save();

    // Optional: Clean up old verified codes for this user
    await TwoFactor.deleteMany({
      user: user._id,
      verified: true,
      _id: { $ne: twoFactorEntry._id }
    });

    res.json({
      success: true,
      message: 'Verification successful',
      userId: user._id,
      email: user.email
    });

  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code'
    });
  }
};

/**
 * Clean up expired codes (optional endpoint for maintenance)
 * @route DELETE /api/auth/2fa/cleanup
 */
const cleanupExpiredCodes = async (req, res) => {
  try {
    const result = await TwoFactor.deleteMany({
      expires_at: { $lt: new Date() }
    });

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired codes`
    });
  } catch (error) {
    console.error('Error cleaning up expired codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up expired codes'
    });
  }
};

/**
 * Check if user has a valid 2FA code (optional)
 * @route GET /api/auth/2fa/status
 */
const checkTwoFactorStatus = async (req, res) => {
  try {
    const { email, userId } = req.query;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        message: 'Email or userId is required'
      });
    }

    // Find user
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for valid code
    const validCode = await TwoFactor.findOne({
      user: user._id,
      expires_at: { $gt: new Date() },
      verified: false
    });

    if (validCode) {
      const remainingTime = Math.max(0, Math.floor((validCode.expires_at - new Date()) / 1000));
      
      res.json({
        success: true,
        hasValidCode: true,
        expiresIn: remainingTime,
        attempts: validCode.attempts
      });
    } else {
      res.json({
        success: true,
        hasValidCode: false
      });
    }

  } catch (error) {
    console.error('Error checking 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check 2FA status'
    });
  }
};

module.exports = {
  sendTwoFactorCode,
  verifyTwoFactorCode,
  cleanupExpiredCodes,
  checkTwoFactorStatus
};