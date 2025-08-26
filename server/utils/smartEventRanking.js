// Smart Event Ranking Utility
// Provides intelligent ranking for nearby events based on user preferences

const User = require('../database/schemas/usersSchema');
const Events = require('../database/schemas/eventsSchema');
const { calculateDistance } = require('./eventUtils');

/**
 * Calculate smart relevance score for events based on user preferences
 * @param {Array} events - Array of events to rank
 * @param {String} userId - User ID for personalization
 * @param {Object} userLocation - User's current location {lat, lng}
 * @param {Object} context - Additional context (query intent, etc.)
 * @returns {Array} - Events with relevance scores, sorted by relevance
 */
const calculateSmartEventRanking = async (events, userId, userLocation = null, context = {}) => {
  try {
    // Get user data for personalization
    const user = await User.findById(userId)
      .select('favorite_activities location friends events tags')
      .populate('friends', '_id location')
      .lean();

    if (!user) {
      // Return events without ranking if user not found
      return events.map(event => ({ ...event, relevanceScore: 0 }));
    }

    const now = new Date();
    const userActivities = user.favorite_activities || [];
    const userFriends = (user.friends || []).map(f => f._id.toString());
    const userPastEvents = user.events || [];
    
    // Extract user's past event categories for pattern recognition
    const userPastCategories = userPastEvents
      .filter(ue => ue.status === 'accepted')
      .map(ue => ue.event?.category)
      .filter(Boolean);

    // Get friends' locations for local social context
    const friendsInArea = user.friends?.filter(friend => 
      friend.location?.coordinates && userLocation &&
      calculateDistance(
        userLocation.lat, userLocation.lng,
        friend.location.coordinates.lat, friend.location.coordinates.lng
      ) <= 50 // Friends within 50 miles
    ) || [];

    const processedEvents = await Promise.all(events.map(async (event) => {
      let relevanceScore = 0;
      const scoringFactors = {
        activityMatch: 0,
        friendCreator: 0,
        friendsAttending: 0,
        locationProximity: 0,
        timeRelevance: 0,
        pastBehavior: 0,
        socialContext: 0,
        popularityBoost: 0
      };

      // 1. ACTIVITY PREFERENCE MATCHING (0-4 points)
      if (event.category && userActivities.includes(event.category)) {
        scoringFactors.activityMatch = 4;
        relevanceScore += 4;
      } else if (event.category && userPastCategories.includes(event.category)) {
        // User has attended similar events before
        scoringFactors.pastBehavior = 2;
        relevanceScore += 2;
      }

      // 2. FRIEND SOCIAL SIGNALS (0-5 points)
      if (event.creator && userFriends.includes(event.creator._id?.toString() || event.creator.toString())) {
        scoringFactors.friendCreator = 3;
        relevanceScore += 3;
      }

      // Count friends attending this event
      const friendsAttending = (event.attendees || []).filter(attendee => 
        userFriends.includes(attendee.user?._id?.toString() || attendee.user?.toString())
      ).length;
      
      if (friendsAttending > 0) {
        scoringFactors.friendsAttending = Math.min(friendsAttending * 1.5, 3); // Max 3 points
        relevanceScore += scoringFactors.friendsAttending;
      }

      // 3. LOCATION PROXIMITY (0-3 points)
      if (userLocation && event.location?.coordinates) {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          event.location.coordinates.lat, event.location.coordinates.lng
        );
        
        if (distance <= 2) {
          scoringFactors.locationProximity = 3; // Very close
        } else if (distance <= 10) {
          scoringFactors.locationProximity = 2; // Close
        } else if (distance <= 25) {
          scoringFactors.locationProximity = 1; // Moderate distance
        }
        relevanceScore += scoringFactors.locationProximity;
      }

      // 4. TIME RELEVANCE (0-2 points)
      const daysUntilEvent = (new Date(event.start_time) - now) / (1000 * 60 * 60 * 24);
      if (daysUntilEvent <= 3) {
        scoringFactors.timeRelevance = 2; // Very soon
      } else if (daysUntilEvent <= 7) {
        scoringFactors.timeRelevance = 1.5; // This week
      } else if (daysUntilEvent <= 14) {
        scoringFactors.timeRelevance = 1; // Next two weeks
      }
      relevanceScore += scoringFactors.timeRelevance;

      // 5. SOCIAL CONTEXT - Friends in the area (0-2 points)
      if (friendsInArea.length > 0 && event.location?.coordinates) {
        const nearbyFriends = friendsInArea.filter(friend =>
          calculateDistance(
            friend.location.coordinates.lat, friend.location.coordinates.lng,
            event.location.coordinates.lat, event.location.coordinates.lng
          ) <= 20
        );
        
        if (nearbyFriends.length > 0) {
          scoringFactors.socialContext = Math.min(nearbyFriends.length * 0.5, 2);
          relevanceScore += scoringFactors.socialContext;
        }
      }

      // 6. EVENT POPULARITY BOOST (0-1 point)
      const attendeeCount = (event.attendees || []).filter(a => a.status === 'accepted').length;
      if (attendeeCount >= 5) {
        scoringFactors.popularityBoost = Math.min(attendeeCount * 0.1, 1);
        relevanceScore += scoringFactors.popularityBoost;
      }

      // 7. QUERY CONTEXT BOOST (0-2 points)
      if (context.isRecommendationQuery) {
        // Boost events that match user's typical event timing patterns
        const userEventHours = userPastEvents
          .map(ue => ue.event?.start_time ? new Date(ue.event.start_time).getHours() : null)
          .filter(h => h !== null);
        
        if (userEventHours.length > 0) {
          const eventHour = new Date(event.start_time).getHours();
          const avgUserHour = userEventHours.reduce((a, b) => a + b, 0) / userEventHours.length;
          const hourDiff = Math.abs(eventHour - avgUserHour);
          
          if (hourDiff <= 2) {
            relevanceScore += 1; // Similar timing preference
          }
        }
      }

      return {
        ...event,
        relevanceScore: Math.round(relevanceScore * 100) / 100, // Round to 2 decimals
        scoringFactors, // For debugging and transparency
        debugInfo: {
          userActivities: userActivities.length,
          friendsCount: userFriends.length,
          friendsAttending,
          locationDistance: userLocation && event.location?.coordinates ? 
            calculateDistance(
              userLocation.lat, userLocation.lng,
              event.location.coordinates.lat, event.location.coordinates.lng
            ) : null
        }
      };
    }));

    // Sort by relevance score (highest first)
    return processedEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);

  } catch (error) {
    console.error('Error in calculateSmartEventRanking:', error);
    // Return original events if ranking fails
    return events.map(event => ({ ...event, relevanceScore: 0 }));
  }
};

/**
 * Determine if a search query indicates the user wants recommendations/suggestions
 * @param {String} query - Search query
 * @param {Object} params - Search parameters
 * @returns {Boolean}
 */
const isRecommendationQuery = (query = '', params = {}) => {
  const recommendationKeywords = [
    'nearby', 'recommend', 'suggest', 'find me', 'what should', 'good events',
    'interesting', 'fun', 'popular', 'trending', 'for me', 'my area'
  ];
  
  const lowerQuery = query.toLowerCase();
  const hasRecommendationKeyword = recommendationKeywords.some(keyword => 
    lowerQuery.includes(keyword)
  );
  
  // If no specific query but location-based search, treat as recommendation
  const isLocationOnlySearch = !query && params.location;
  
  // If no categories specified, likely wants recommendations
  const isOpenEndedSearch = !params.categories || params.categories.length === 0;
  
  return hasRecommendationKeyword || isLocationOnlySearch || isOpenEndedSearch;
};

/**
 * Enhanced version of searchEvents with smart ranking
 * @param {Object} params - Search parameters
 * @param {String} userId - User ID
 * @param {Object} userLocation - User location
 * @returns {Object} - Search results with smart ranking
 */
const enhancedSearchEvents = async (params, userId, userLocation = null) => {
  const isRecommendation = isRecommendationQuery(params.query, params);
  
  // Add context for ranking algorithm
  const rankingContext = {
    isRecommendationQuery: isRecommendation,
    originalQuery: params.query,
    searchType: isRecommendation ? 'recommendation' : 'search'
  };

  return {
    isRecommendation,
    rankingContext
  };
};

module.exports = {
  calculateSmartEventRanking,
  isRecommendationQuery,
  enhancedSearchEvents
};