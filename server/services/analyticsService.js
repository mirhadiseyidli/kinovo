const Analytics = require('../database/schemas/analyticsSchema');
const User = require('../database/schemas/usersSchema');
const UserPresence = require('../database/schemas/userPresenceSchema');

class AnalyticsService {
  constructor() {
    this.userChangeStream = null;
    this.presenceChangeStream = null;
    this.sessionStore = new Map(); // userId -> { startTime, lastActivity }
  }

  // Initialize change streams for real-time analytics
  async initializeChangeStreams() {
    try {
      await this.setupUserChangeStream();
      await this.setupPresenceChangeStream();
    } catch (error) {
      console.error('Failed to initialize analytics change streams:', error);
      throw error;
    }
  }

  // Listen to Users collection changes for new registrations
  async setupUserChangeStream() {
    this.userChangeStream = User.collection.watch([
      { $match: { 'operationType': 'insert' } }
    ], { fullDocument: 'updateLookup' });

    this.userChangeStream.on('change', async (change) => {
      try {
        if (change.operationType === 'insert') {
          await this.handleNewUser(change.fullDocument);
        }
      } catch (error) {
        console.error('Error processing user change:', error);
      }
    });

    this.userChangeStream.on('error', (error) => {
      console.error('User change stream error:', error);
      this.reconnectUserChangeStream();
    });
  }

  // Listen to UserPresence collection changes for session tracking
  async setupPresenceChangeStream() {
    this.presenceChangeStream = UserPresence.collection.watch([
      { $match: { 
        $or: [
          { 'operationType': 'insert' },
          { 'operationType': 'update' },
          { 'operationType': 'replace' }
        ]
      }}
    ], { fullDocument: 'updateLookup' });

    this.presenceChangeStream.on('change', async (change) => {
      try {
        await this.handlePresenceChange(change);
      } catch (error) {
        console.error('Error processing presence change:', error);
      }
    });

    this.presenceChangeStream.on('error', (error) => {
      console.error('Presence change stream error:', error);
      this.reconnectPresenceChangeStream();
    });
  }

  // Handle new user registration
  async handleNewUser(userDoc) {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get total users count
      const totalUsers = await User.countDocuments();
      
      // Get or create today's analytics
      const analytics = await Analytics.getOrCreateToday();
      
      // Update analytics with new user
      await Analytics.findOneAndUpdate(
        { date: today },
        {
          $inc: { newUserCount: 1 },
          $set: { totalUsers },
          $addToSet: { cohortDay0Ids: userDoc._id }
        },
        { upsert: true }
      );

    } catch (error) {
      console.error('Error updating analytics for new user:', error);
    }
  }

  // Handle user presence changes for session tracking
  async handlePresenceChange(change) {
    const userId = change.fullDocument?.userId;
    if (!userId) return;

    const isOnline = change.fullDocument?.online;
    const today = new Date().toISOString().split('T')[0];

    try {
      const analytics = await Analytics.getOrCreateToday();
      
      if (isOnline) {
        // User came online - start session
        await this.startUserSession(userId, analytics);
      } else {
        // User went offline - end session
        await this.endUserSession(userId, analytics);
      }

      // Always add to daily active users
      await Analytics.findOneAndUpdate(
        { date: today },
        { $addToSet: { dailyActiveUserIds: userId } },
        { upsert: true }
      );

    } catch (error) {
      console.error('Error handling presence change:', error);
    }
  }

  // Start tracking user session
  async startUserSession(userId, analytics) {
    const now = new Date();
    
    // Store session start time
    this.sessionStore.set(userId.toString(), {
      startTime: now,
      lastActivity: now
    });

    // Increment session count
    await Analytics.findOneAndUpdate(
      { date: analytics.date },
      { $inc: { sessionCount: 1 } }
    );

  }

  // End user session and calculate duration
  async endUserSession(userId, analytics) {
    const userIdStr = userId.toString();
    const sessionData = this.sessionStore.get(userIdStr);
    
    if (!sessionData) return;

    const now = new Date();
    const sessionDuration = Math.floor((now - sessionData.startTime) / 1000); // seconds
    
    // Remove from session store
    this.sessionStore.delete(userIdStr);

    // Update average session duration
    await this.updateAverageSessionDuration(analytics.date, sessionDuration);

  }

  // Update average session duration with new session
  async updateAverageSessionDuration(date, newSessionDuration) {
    const analytics = await Analytics.findOne({ date });
    if (!analytics) return;

    const currentAvg = analytics.avgSessionDuration || 0;
    const sessionCount = analytics.sessionCount || 1;
    
    // Calculate new average: (currentAvg * (sessionCount-1) + newDuration) / sessionCount
    const newAvg = Math.floor(((currentAvg * (sessionCount - 1)) + newSessionDuration) / sessionCount);

    await Analytics.findOneAndUpdate(
      { date },
      { $set: { avgSessionDuration: newAvg } }
    );
  }

  // Calculate retention cohorts (run daily via cron or on-demand)
  async calculateRetentionCohorts() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate cohort dates
    const day1Date = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7Date = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Date = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Get today's active users
      const todaysAnalytics = await Analytics.findOne({ date: todayStr });
      if (!todaysAnalytics?.dailyActiveUserIds?.length) return;

      const activeToday = todaysAnalytics.dailyActiveUserIds;

      // Find users who signed up on each cohort date and are active today
      const [day1Cohort, day7Cohort, day30Cohort] = await Promise.all([
        this.findCohortRetention(day1Date, activeToday),
        this.findCohortRetention(day7Date, activeToday),
        this.findCohortRetention(day30Date, activeToday)
      ]);

      // Update today's analytics with retention data
      await Analytics.findOneAndUpdate(
        { date: todayStr },
        {
          $set: {
            cohortDay1Ids: day1Cohort,
            cohortDay7Ids: day7Cohort,
            cohortDay30Ids: day30Cohort
          }
        }
      );

    } catch (error) {
      console.error('Error calculating retention cohorts:', error);
    }
  }

  // Find users from cohort date who are active today
  async findCohortRetention(cohortDate, activeTodayIds) {
    const cohortDateStr = cohortDate.toISOString().split('T')[0];
    
    // Find analytics for the cohort date
    const cohortAnalytics = await Analytics.findOne({ date: cohortDateStr });
    if (!cohortAnalytics?.cohortDay0Ids?.length) return [];

    // Find intersection of cohort users and today's active users
    const cohortUserIds = cohortAnalytics.cohortDay0Ids.map(id => id.toString());
    const activeTodayStrs = activeTodayIds.map(id => id.toString());
    
    return cohortAnalytics.cohortDay0Ids.filter(userId => 
      activeTodayStrs.includes(userId.toString())
    );
  }

  // Update location statistics when users update their location
  async updateLocationStats(userLocation) {
    if (!userLocation?.state) return;

    const today = new Date().toISOString().split('T')[0];
    const state = userLocation.state;

    try {
      await Analytics.findOneAndUpdate(
        { date: today },
        { $inc: { [`topStates.${state}`]: 1 } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating location stats:', error);
    }
  }

  // Get analytics dashboard data
  async getDashboardData(days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    try {
      const analytics = await Analytics.findByDateRange(startDateStr, endDateStr);
      
      return {
        dailyStats: analytics,
        summary: this.calculateSummaryStats(analytics),
        retention: this.calculateRetentionRates(analytics)
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return null;
    }
  }

  // Calculate summary statistics
  calculateSummaryStats(analyticsData) {
    if (!analyticsData.length) return null;

    const latest = analyticsData[0];
    const totalSessions = analyticsData.reduce((sum, day) => sum + (day.sessionCount || 0), 0);
    const totalActiveUsers = new Set();
    
    analyticsData.forEach(day => {
      if (day.dailyActiveUserIds) {
        day.dailyActiveUserIds.forEach(id => totalActiveUsers.add(id.toString()));
      }
    });

    return {
      totalUsers: latest.totalUsers || 0,
      totalActiveUsers: totalActiveUsers.size,
      totalSessions,
      avgSessionDuration: latest.avgSessionDuration || 0,
      topStates: latest.topStates || {}
    };
  }

  // Calculate retention rates
  calculateRetentionRates(analyticsData) {
    if (!analyticsData.length) return null;

    const latest = analyticsData[0];
    return {
      day1: latest.getRetentionRate(1),
      day7: latest.getRetentionRate(7),
      day30: latest.getRetentionRate(30)
    };
  }

  // Cleanup method
  async cleanup() {
    if (this.userChangeStream) {
      await this.userChangeStream.close();
    }
    if (this.presenceChangeStream) {
      await this.presenceChangeStream.close();
    }
    this.sessionStore.clear();
  }

  // Reconnection methods for resilience
  async reconnectUserChangeStream() {
    try {
      if (this.userChangeStream) {
        await this.userChangeStream.close();
      }
      setTimeout(() => this.setupUserChangeStream(), 5000);
    } catch (error) {
      console.error('Error reconnecting user change stream:', error);
    }
  }

  async reconnectPresenceChangeStream() {
    try {
      if (this.presenceChangeStream) {
        await this.presenceChangeStream.close();
      }
      setTimeout(() => this.setupPresenceChangeStream(), 5000);
    } catch (error) {
      console.error('Error reconnecting presence change stream:', error);
    }
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
module.exports = analyticsService;