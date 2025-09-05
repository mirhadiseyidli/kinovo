const analyticsService = require('../services/analyticsService');
const Analytics = require('../database/schemas/analyticsSchema');
const User = require('../database/schemas/usersSchema');
const UserPresence = require('../database/schemas/userPresenceSchema');
const { verifyAccessToken } = require('../utils/token');

const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded._id).select('role');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.user = { ...decoded, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Helper function to get date in PST
const getPSTDate = (date = new Date()) => {
  const pstOffset = -8; // PST is UTC-8
  const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
  const pstDate = new Date(utcDate.getTime() + pstOffset * 3600000);
  return pstDate.toISOString().split('T')[0];
};

// Helper function to get PST date range in UTC
const getPSTDateRange = (startDate, endDate) => {
  const startDateStr = typeof startDate === 'string' ? startDate : getPSTDate(startDate);
  const endDateStr = typeof endDate === 'string' ? endDate : getPSTDate(endDate);
  
  // Create UTC timestamps for PST day range
  // PST 00:00:00 = UTC 08:00:00 same day
  // PST 23:59:59 = UTC 07:59:59 next day
  const start = new Date(startDateStr + 'T08:00:00.000Z');
  const nextDay = new Date(endDateStr);
  nextDay.setDate(nextDay.getDate() + 1); // Move to next day
  const end = new Date(nextDay.toISOString().split('T')[0] + 'T07:59:59.999Z');
  
  return { start, end };
};

// Calculate analytics for any given date or date range
const calculateAnalytics = async (startDate, endDate) => {
  const dateRange = getPSTDateRange(startDate, endDate || startDate);
  
  // Get all users with their registration dates and locations
  const allUsers = await User.find({});

  // Get user presence data
  const userPresenceData = await UserPresence.find({});
  const presenceMap = new Map();
  userPresenceData.forEach(p => {
    presenceMap.set(p.userId.toString(), {
      online: p.online,
      lastActive: p.lastActive
    });
  });

  // Get session counts for each user
  const sessionCounts = await Analytics.aggregate([
    { $unwind: '$sessions' },
    { 
      $group: {
        _id: '$sessions.userId',
        sessionCount: { $sum: 1 }
      }
    }
  ]);
  const sessionCountMap = new Map();
  sessionCounts.forEach(s => {
    sessionCountMap.set(s._id.toString(), s.sessionCount);
  });

  // Calculate total users
  const totalUsers = allUsers.length;
  const totalUsersList = allUsers.map(u => {
    const presence = presenceMap.get(u._id.toString());
    return {
      _id: u._id,
      full_name: u.full_name,
      username: u.username,
      email: u.email,
      profile_picture: u.profile_picture,
      createdAt: u.created_at,
      city: u.location?.city || 'Unknown',
      state: u.location?.state || 'Unknown',
      lastLogin: presence?.lastActive || u.last_login_at || u.created_at,
      friendsCount: u.friends ? u.friends.length : 0,
      eventsCount: u.events ? u.events.length : 0,
      sessionCount: sessionCountMap.get(u._id.toString()) || 0,
      isOnline: presence?.online || false,
      lastActive: presence?.lastActive || u.last_login_at || u.created_at
    };
  });

  // Calculate new users for the period
  const newUsers = allUsers.filter(u => 
    u.created_at >= dateRange.start && u.created_at <= dateRange.end
  );
  const newUserCount = newUsers.length;
  const newUserIds = newUsers.map(u => u._id);

  // Get analytics data for sessions
  const analyticsData = await Analytics.find({
    date: {
      $gte: getPSTDate(dateRange.start),
      $lte: getPSTDate(dateRange.end)
    }
  });

  // Calculate daily active users based on UserPresence lastActive for the date range
  const dailyActiveUserIds = new Set();
  
  userPresenceData.forEach(presence => {
    const lastActiveDate = new Date(presence.lastActive);
    // Check if user was active within the date range
    if (lastActiveDate >= dateRange.start && lastActiveDate <= dateRange.end) {
      dailyActiveUserIds.add(presence.userId.toString());
    }
  });

  // Calculate sessions from analytics data (for session metrics)
  const uniqueSessionUsers = new Set();
  let totalSessions = 0;
  let totalDuration = 0;
  const sessionDetails = [];

  analyticsData.forEach(day => {
    day.sessions.forEach(session => {
      uniqueSessionUsers.add(session.userId.toString());
      totalSessions++;
      if (session.duration) {
        totalDuration += session.duration;
      }
      sessionDetails.push({
        userId: session.userId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration
      });
    });
  });

  const dailyActiveUsers = Array.from(dailyActiveUserIds);
  const avgSessionDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

  // Calculate state distribution
  const stateDistribution = {};
  allUsers.forEach(user => {
    const state = user.location?.state || 'Unknown';
    stateDistribution[state] = (stateDistribution[state] || 0) + 1;
  });

  // Sort states by user count
  const topStates = Object.entries(stateDistribution)
    .sort(([,a], [,b]) => b - a)
    .reduce((obj, [state, count]) => {
      obj[state] = count;
      return obj;
    }, {});

  return {
    totalUsers,
    totalUsersList,
    newUserCount,
    newUserIds,
    dailyActiveUsers,
    dailyActiveUserCount: dailyActiveUsers.length,
    sessionCount: totalSessions,
    avgSessionDuration,
    sessionDetails,
    topStates,
    dateRange: {
      start: getPSTDate(dateRange.start),
      end: getPSTDate(dateRange.end)
    }
  };
};

// Calculate user retention
const calculateRetention = async (cohortDate, daysSince) => {
  const cohortDateStr = getPSTDate(new Date(cohortDate));
  const targetDate = new Date(cohortDate);
  targetDate.setDate(targetDate.getDate() + daysSince);
  const targetDateStr = getPSTDate(targetDate);

  // Get users who signed up on cohort date
  const cohortUsers = await User.find({
    created_at: {
      $gte: new Date(cohortDateStr),
      $lt: new Date(new Date(cohortDateStr).getTime() + 24 * 60 * 60 * 1000)
    }
  }, '_id');

  if (cohortUsers.length === 0) return { rate: 0, cohortSize: 0, retainedCount: 0 };

  const cohortUserIds = cohortUsers.map(u => u._id);

  // Get analytics for target date
  const targetAnalytics = await Analytics.findOne({ date: targetDateStr });
  
  if (!targetAnalytics) return { rate: 0, cohortSize: cohortUsers.length, retainedCount: 0 };

  // Find how many cohort users were active on target date
  const activeUserIds = new Set(targetAnalytics.sessions.map(s => s.userId.toString()));
  const retainedUsers = cohortUserIds.filter(id => activeUserIds.has(id.toString()));

  const retentionRate = (retainedUsers.length / cohortUsers.length) * 100;

  return {
    rate: retentionRate.toFixed(2),
    cohortSize: cohortUsers.length,
    retainedCount: retainedUsers.length,
    cohortDate: cohortDateStr,
    targetDate: targetDateStr
  };
};

const getDashboard = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    // Calculate analytics for the period
    const analytics = await calculateAnalytics(startDate, endDate);

    // Calculate retention rates for today's cohort
    const retentionDay1 = await calculateRetention(
      new Date(new Date().setDate(new Date().getDate() - 1)), 
      1
    );
    const retentionDay7 = await calculateRetention(
      new Date(new Date().setDate(new Date().getDate() - 7)),
      7
    );
    const retentionDay30 = await calculateRetention(
      new Date(new Date().setDate(new Date().getDate() - 30)),
      30
    );

    // Calculate period-based new users
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const weeklyNewUsers = await User.countDocuments({
      created_at: { $gte: weekAgo }
    });

    const monthlyNewUsers = await User.countDocuments({
      created_at: { $gte: monthAgo }
    });

    const dailyNewUsers = await User.countDocuments({
      created_at: { 
        $gte: new Date(getPSTDate()), 
        $lt: new Date(new Date(getPSTDate()).getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      success: true,
      data: {
        ...analytics,
        newUsers: {
          daily: dailyNewUsers,
          weekly: weeklyNewUsers,
          monthly: monthlyNewUsers
        },
        retention: {
          day1: retentionDay1,
          day7: retentionDay7,
          day30: retentionDay30
        },
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics dashboard'
    });
  }
};

const backfillAnalytics = async (_req, res) => {
  try {
    const result = await analyticsService.backfillAnalytics();
    
    res.json({
      success: true,
      message: 'Analytics backfilled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error backfilling analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to backfill analytics'
    });
  }
};

const calculateRetentionEndpoint = async (req, res) => {
  try {
    const { cohortDate, days } = req.query;
    
    if (!cohortDate || !days) {
      return res.status(400).json({
        success: false,
        message: 'cohortDate and days parameters are required'
      });
    }

    const retention = await calculateRetention(
      new Date(cohortDate),
      parseInt(days)
    );
    
    res.json({
      success: true,
      data: retention
    });
  } catch (error) {
    console.error('Error calculating retention:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate retention'
    });
  }
};

const getTodaysAnalytics = async (_req, res) => {
  try {
    const today = getPSTDate();
    const analytics = await calculateAnalytics(today, today);

    // Get current online users without populate
    const onlinePresence = await UserPresence.find({ online: true });
    const onlineUserIds = onlinePresence.map(p => p.userId);
    
    // Get user details for online users
    const onlineUsersData = await User.find({ 
      _id: { $in: onlineUserIds } 
    }, 'full_name username profile_picture');

    // Map presence data with user data
    const onlineUsers = onlinePresence.map(presence => {
      const userData = onlineUsersData.find(user => 
        user._id.toString() === presence.userId.toString()
      );
      return {
        _id: presence._id,
        userId: userData || { 
          full_name: 'Unknown', 
          username: 'unknown', 
          profile_picture: null 
        },
        online: presence.online,
        lastActive: presence.lastActive
      };
    });

    res.json({
      success: true,
      data: {
        date: today,
        ...analytics,
        currentlyOnline: {
          count: onlineUsers.length,
          users: onlineUsers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s analytics'
    });
  }
};

const updateLocationStats = async (req, res) => {
  try {
    const { state } = req.body;
    
    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State is required'
      });
    }

    await analyticsService.updateLocationStats({ state });
    
    res.json({
      success: true,
      message: 'Location stats updated'
    });
  } catch (error) {
    console.error('Error updating location stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location stats'
    });
  }
};

module.exports = {
  requireAdmin,
  getDashboard,
  backfillAnalytics,
  calculateRetention: calculateRetentionEndpoint,
  getTodaysAnalytics,
  updateLocationStats
};