const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { 
    success: false, 
    error: 'Too many requests from this IP, please try again later.' 
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { 
    success: false, 
    error: 'Too many authentication attempts, please try again later.' 
  },
  skipSuccessfulRequests: true, // Don't count successful auth requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.'
    });
  }
});

// Two-factor auth limiter (even stricter)
const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 2FA attempts
  message: { 
    success: false, 
    error: 'Too many 2FA verification attempts. Please wait before trying again.' 
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many 2FA verification attempts. Please wait before trying again.'
    });
  }
});

// AI endpoints limiter (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 AI requests per hour
  message: { 
    success: false, 
    error: 'AI request limit exceeded, please try again later.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'AI request limit exceeded, please try again later.'
    });
  }
});

// Search endpoints limiter
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: { 
    success: false, 
    error: 'Too many search requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many search requests, please slow down.'
    });
  }
});

// Event creation/update limiter (for write operations)
const eventWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 event writes per 5 minutes
  message: { 
    success: false, 
    error: 'Too many event operations, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many event operations, please slow down.'
    });
  }
});

// Event read operations limiter (more lenient)
const eventReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 event reads per minute
  message: { 
    success: false, 
    error: 'Too many event requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many event requests, please slow down.'
    });
  }
});

// User profile read operations limiter
const userReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 user reads per minute
  message: { 
    success: false, 
    error: 'Too many user profile requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many user profile requests, please slow down.'
    });
  }
});

// User profile write operations limiter
const userWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 user writes per 5 minutes
  message: { 
    success: false, 
    error: 'Too many user profile changes, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many user profile changes, please slow down.'
    });
  }
});

// Friends management read operations limiter
const friendsReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 friend reads per minute
  message: { 
    success: false, 
    error: 'Too many friend requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many friend requests, please slow down.'
    });
  }
});

// Friends management write operations limiter
const friendsWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 friend operations per 5 minutes
  message: { 
    success: false, 
    error: 'Too many friend operations, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many friend operations, please slow down.'
    });
  }
});

// Notification read operations limiter
const notificationReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 notification reads per minute
  message: { 
    success: false, 
    error: 'Too many notification requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many notification requests, please slow down.'
    });
  }
});

// Notification write operations limiter (sending notifications, updating preferences)
const notificationWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 notification writes per 15 minutes
  message: { 
    success: false, 
    error: 'Too many notification operations, please try again later.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many notification operations, please try again later.'
    });
  }
});

// Push notification limiter (for actual push sending)
const pushNotificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 push operations per hour
  message: { 
    success: false, 
    error: 'Too many push notification requests, please try again later.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many push notification requests, please try again later.'
    });
  }
});

// Weather API limiter
const weatherLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 weather requests per minute
  message: { 
    success: false, 
    error: 'Too many weather requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many weather requests, please slow down.'
    });
  }
});

// MapKit API limiter
const mapKitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40, // limit each IP to 40 map requests per minute
  message: { 
    success: false, 
    error: 'Too many map requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many map requests, please slow down.'
    });
  }
});

// Google API limiter
const googleApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 Google API requests per minute
  message: { 
    success: false, 
    error: 'Too many Google API requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many Google API requests, please slow down.'
    });
  }
});

// Storage operations limiter
const storageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 storage operations per 5 minutes
  message: { 
    success: false, 
    error: 'Too many storage requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many storage requests, please slow down.'
    });
  }
});

// Category operations limiter (light limiting since it's mostly read-only)
const categoryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 category requests per minute
  message: { 
    success: false, 
    error: 'Too many category requests, please slow down.' 
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many category requests, please slow down.'
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  twoFactorLimiter,
  aiLimiter,
  searchLimiter,
  eventWriteLimiter,
  eventReadLimiter,
  userReadLimiter,
  userWriteLimiter,
  friendsReadLimiter,
  friendsWriteLimiter,
  notificationReadLimiter,
  notificationWriteLimiter,
  pushNotificationLimiter,
  weatherLimiter,
  mapKitLimiter,
  googleApiLimiter,
  storageLimiter,
  categoryLimiter
};