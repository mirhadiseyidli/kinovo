const mongoose = require('mongoose');
const Analytics = require('./analyticsSchema');

const userPresenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  online: {
    type: Boolean,
    default: false,
    index: true
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
userPresenceSchema.index({ online: 1, lastActive: -1 });

// Helper function to get PST date
function getPSTDate(date = new Date()) {
  const pstOffset = -8; // PST is UTC-8
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const pstDate = new Date(utcDate.getTime() + pstOffset * 3600000);
  return pstDate.toISOString().split('T')[0];
}

// In-memory store for active sessions to track session IDs
const activeSessions = new Map(); // userId -> { sessionId, startTime, date }

// Update the updatedAt field on save
userPresenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods
userPresenceSchema.statics.setUserOnline = async function(userId) {
  try {
    // Update user presence
    const presence = await this.findOneAndUpdate(
      { userId },
      { 
        online: true, 
        lastActive: new Date(),
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    const userIdStr = userId.toString();
    
    // Check if user already has an active session
    if (!activeSessions.has(userIdStr)) {
      // Start a new session
      const sessionId = new Date().getTime().toString();
      const startTime = new Date();
      const today = getPSTDate();
      
      // Store active session in memory
      activeSessions.set(userIdStr, {
        sessionId,
        startTime,
        date: today
      });

      // Create session entry in Analytics
      await Analytics.findOneAndUpdate(
        { date: today },
        {
          $push: {
            sessions: {
              userId: userId,
              startTime: startTime,
              endTime: null,
              duration: 0,
              sessionId: sessionId
            }
          }
        },
        { upsert: true }
      );

      console.log(`Session started for user ${userId} at ${startTime}`);
    }

    return presence;
  } catch (error) {
    console.error('Error in setUserOnline:', error);
    throw error;
  }
};

userPresenceSchema.statics.setUserOffline = async function(userId) {
  try {
    // Update user presence
    const presence = await this.findOneAndUpdate(
      { userId },
      { 
        online: false, 
        lastActive: new Date(),
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    const userIdStr = userId.toString();
    const activeSession = activeSessions.get(userIdStr);

    if (activeSession) {
      const endTime = new Date();
      const duration = endTime - activeSession.startTime;
      const { sessionId, date } = activeSession;

      // Update session in Analytics with end time and duration
      await Analytics.findOneAndUpdate(
        { 
          date: date,
          'sessions.sessionId': sessionId
        },
        {
          $set: {
            'sessions.$.endTime': endTime,
            'sessions.$.duration': duration
          }
        }
      );

      // Remove from active sessions
      activeSessions.delete(userIdStr);

      console.log(`Session ended for user ${userId}. Duration: ${Math.round(duration / 1000)}s`);
    }

    return presence;
  } catch (error) {
    console.error('Error in setUserOffline:', error);
    throw error;
  }
};

userPresenceSchema.statics.getOnlineUsers = function() {
  return this.find({ online: true })
    .populate('userId', 'full_name username profile_picture')
    .sort({ lastActive: -1 });
};

userPresenceSchema.statics.getUserPresence = function(userId) {
  return this.findOne({ userId })
    .populate('userId', 'full_name username profile_picture');
};

userPresenceSchema.statics.getFriendsPresence = function(userIds) {
  return this.find({ userId: { $in: userIds } })
    .populate('userId', 'full_name username profile_picture')
    .sort({ lastActive: -1 });
};

// Clean up old offline statuses (older than 7 days)
userPresenceSchema.statics.cleanupOldStatuses = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ 
    online: false, 
    lastActive: { $lt: sevenDaysAgo } 
  });
};

// Clean up old sessions (sessions without end time after 2 hours)
userPresenceSchema.statics.cleanupOldSessions = async function() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    // Find sessions that started more than 2 hours ago and have no end time
    const today = getPSTDate();
    const analytics = await Analytics.findOne({ date: today });
    
    if (!analytics) return;

    let updated = false;
    analytics.sessions.forEach(session => {
      if (!session.endTime && session.startTime < twoHoursAgo) {
        // Force end the session
        session.endTime = new Date(session.startTime.getTime() + 30 * 60 * 1000); // Assume 30 min session
        session.duration = 30 * 60 * 1000; // 30 minutes
        updated = true;
        
        // Remove from active sessions
        activeSessions.delete(session.userId.toString());
      }
    });

    if (updated) {
      await analytics.save();
      console.log('Cleaned up old sessions');
    }
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
};

// Initialize sessions - restore active sessions from database
userPresenceSchema.statics.initializeSessions = async function() {
  try {
    const today = getPSTDate();
    const analytics = await Analytics.findOne({ date: today });
    
    if (analytics) {
      // Restore active sessions (sessions without end time)
      analytics.sessions.forEach(session => {
        if (!session.endTime) {
          activeSessions.set(session.userId.toString(), {
            sessionId: session.sessionId,
            startTime: session.startTime,
            date: today
          });
        }
      });
    }

    console.log(`UserPresence sessions initialized. ${activeSessions.size} active sessions restored.`);
  } catch (error) {
    console.error('Error initializing UserPresence sessions:', error);
  }
};

module.exports = mongoose.model('UserPresence', userPresenceSchema);