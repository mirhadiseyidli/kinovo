// Knowledge Base Tool for AI Agent
import { tool } from 'ai';
import { z } from 'zod';
import { personalizedEventSearch, getUserContext } from '../rag/vector-search.js';

// Schema for knowledge base queries
const knowledgeBaseSchema = z.object({
  query: z.string().describe('Natural language query about user history, preferences, or related events'),
  context_type: z.enum(['user_history', 'event_recommendations', 'social_connections', 'preferences']).describe('Type of information to retrieve'),
  limit: z.number().min(1).max(10).default(5).describe('Maximum number of results to return'),
});

// Knowledge base tool implementation
export const knowledgeBase = tool({
  description: 'Query the user\'s event history, preferences, and related information to provide personalized assistance',
  parameters: knowledgeBaseSchema,
  execute: async ({ query, context_type, limit }, { headers }) => {
    try {
      const token = headers?.authorization?.split(' ')[1];
      if (!token) throw new Error('No authorization token');
      
      // Import auth and get user
      const { verifyUserToken } = await import('../lib/auth.js');
      const user = await verifyUserToken(token);
      
      console.log(`🔍 Knowledge base query for ${user.userId}: "${query}" (${context_type})`);
      
      let results = {};
      
      switch (context_type) {
        case 'user_history':
          results = await getUserEventHistory(user.userId, query, limit);
          break;
          
        case 'event_recommendations':
          results = await getPersonalizedRecommendations(user.userId, query, limit);
          break;
          
        case 'social_connections':
          results = await getSocialConnections(user.userId, query, limit);
          break;
          
        case 'preferences':
          results = await getUserPreferences(user.userId, query);
          break;
          
        default:
          // General query - search across all types
          results = await getGeneralKnowledge(user.userId, query, limit);
      }
      
      return {
        success: true,
        context_type,
        query,
        results: JSON.parse(JSON.stringify(results)), // Ensure serializable
        insights: generateInsights(results, context_type),
      };
      
    } catch (error) {
      console.error('Knowledge base query failed:', error);
      return {
        success: false,
        error: error.message,
        context_type,
        query,
      };
    }
  },
});

/**
 * Get user's event history and patterns
 */
async function getUserEventHistory(userId, query, limit) {
  try {
    const userContext = await getUserContext(userId, query, {
      includeEventHistory: true,
      includeSocialContext: true,
      maxEvents: limit,
    });
    
    return {
      recent_events: userContext.recent_events || [],
      social_context: userContext.social_context || {},
      activity_patterns: analyzeActivityPatterns(userContext),
      summary: `User has attended ${userContext.social_context?.total_events_attended || 0} events`,
    };
    
  } catch (error) {
    console.error('Failed to get user history:', error);
    return { recent_events: [], error: error.message };
  }
}

/**
 * Get personalized event recommendations
 */
async function getPersonalizedRecommendations(userId, query, limit) {
  try {
    const searchResults = await personalizedEventSearch(userId, query, {
      limit,
      visibility: ['public'],
      minScore: 0.6,
    });
    
    return {
      recommended_events: searchResults.query_results || [],
      personalized_events: searchResults.personalized_recommendations || [],
      user_context: searchResults.user_context || {},
      total_found: searchResults.total_results || 0,
      recommendation_reasons: generateRecommendationReasons(searchResults),
    };
    
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return { recommended_events: [], error: error.message };
  }
}

/**
 * Get social connections and network information
 */
async function getSocialConnections(userId, query, limit) {
  // This would query the Users collection for friends and their activities
  // For now, return a placeholder
  const Users = (await import('../../database/schemas/usersSchema.js')).default;
  
  try {
    const user = await Users.findById(userId)
      .populate('friends', 'first_name last_name favorite_activities')
      .lean();
    
    if (!user) {
      return { friends: [], error: 'User not found' };
    }
    
    const friends = user.friends || [];
    const commonInterests = findCommonInterests(user.favorite_activities || [], friends);
    
    return {
      friends_count: friends.length,
      friends: friends.slice(0, limit).map(friend => ({
        name: `${friend.first_name} ${friend.last_name}`,
        common_interests: friend.favorite_activities?.filter(activity => 
          user.favorite_activities?.includes(activity)
        ) || [],
      })),
      common_interests,
      social_summary: `Connected with ${friends.length} friends with ${commonInterests.length} common interests`,
    };
    
  } catch (error) {
    console.error('Failed to get social connections:', error);
    return { friends: [], error: error.message };
  }
}

/**
 * Get user preferences and interests
 */
async function getUserPreferences(userId, query) {
  try {
    const userContext = await getUserContext(userId, query, {
      includePreferences: true,
      includeEventHistory: true,
    });
    
    return {
      favorite_activities: userContext.user_preferences || [],
      interests: userContext.interests || '',
      activity_level: userContext.activity_level || 'medium',
      preferences_summary: buildPreferencesSummary(userContext),
      behavioral_insights: analyzeBehavioralPatterns(userContext),
    };
    
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    return { favorite_activities: [], error: error.message };
  }
}

/**
 * General knowledge search across all user data
 */
async function getGeneralKnowledge(userId, query, limit) {
  try {
    // Combine multiple search types for comprehensive results
    const [userHistory, recommendations, preferences] = await Promise.allSettled([
      getUserEventHistory(userId, query, 3),
      getPersonalizedRecommendations(userId, query, 3),
      getUserPreferences(userId, query),
    ]);
    
    return {
      user_history: userHistory.status === 'fulfilled' ? userHistory.value : {},
      recommendations: recommendations.status === 'fulfilled' ? recommendations.value : {},
      preferences: preferences.status === 'fulfilled' ? preferences.value : {},
      comprehensive_summary: generateComprehensiveSummary(userId, query),
    };
    
  } catch (error) {
    console.error('Failed to get general knowledge:', error);
    return { error: error.message };
  }
}

// Helper functions
function analyzeActivityPatterns(userContext) {
  const patterns = [];
  
  if (userContext.recent_events?.length > 0) {
    const categories = userContext.recent_events.map(e => e.category);
    const uniqueCategories = [...new Set(categories)];
    
    if (uniqueCategories.length === 1) {
      patterns.push(`Consistently attends ${uniqueCategories[0]} events`);
    } else {
      patterns.push(`Diverse interests across ${uniqueCategories.length} categories`);
    }
  }
  
  const activityLevel = userContext.social_context?.total_events_attended || 0;
  if (activityLevel > 10) {
    patterns.push('Very active community member');
  } else if (activityLevel > 3) {
    patterns.push('Regular event participant');
  } else {
    patterns.push('New or occasional participant');
  }
  
  return patterns;
}

function generateRecommendationReasons(searchResults) {
  const reasons = [];
  
  if (searchResults.user_context?.user_preferences?.length > 0) {
    reasons.push(`Based on your interests in ${searchResults.user_context.user_preferences.slice(0, 2).join(' and ')}`);
  }
  
  if (searchResults.user_context?.recent_events?.length > 0) {
    const recentCategories = searchResults.user_context.recent_events.map(e => e.category);
    const uniqueCategories = [...new Set(recentCategories)];
    reasons.push(`Similar to your recent ${uniqueCategories[0]} activities`);
  }
  
  return reasons;
}

function findCommonInterests(userInterests, friends) {
  const allFriendInterests = friends.flatMap(friend => friend.favorite_activities || []);
  return userInterests.filter(interest => allFriendInterests.includes(interest));
}

function buildPreferencesSummary(userContext) {
  const preferences = userContext.user_preferences || [];
  const activityLevel = userContext.activity_level || 'medium';
  
  if (preferences.length === 0) {
    return `${activityLevel} activity level, exploring various interests`;
  }
  
  return `${activityLevel} activity level with strong interests in ${preferences.slice(0, 3).join(', ')}`;
}

function analyzeBehavioralPatterns(userContext) {
  const patterns = [];
  
  if (userContext.activity_level === 'high') {
    patterns.push('Enjoys frequent social activities and networking');
  } else if (userContext.activity_level === 'low') {
    patterns.push('Prefers selective, meaningful engagements');
  }
  
  const preferences = userContext.user_preferences || [];
  if (preferences.length > 5) {
    patterns.push('Demonstrates diverse interests and openness to new experiences');
  } else if (preferences.length > 0) {
    patterns.push(`Shows focused interest in ${preferences[0]} activities`);
  }
  
  return patterns;
}

function generateComprehensiveSummary(userId, query) {
  return `Comprehensive user profile analysis for query: "${query}". Includes activity history, personalized recommendations, and behavioral insights.`;
}

function generateInsights(results, contextType) {
  const insights = [];
  
  switch (contextType) {
    case 'user_history':
      if (results.recent_events?.length > 0) {
        insights.push(`User has been active with ${results.recent_events.length} recent events`);
      }
      if (results.activity_patterns?.length > 0) {
        insights.push(results.activity_patterns[0]);
      }
      break;
      
    case 'event_recommendations':
      if (results.recommended_events?.length > 0) {
        insights.push(`Found ${results.recommended_events.length} relevant events`);
      }
      if (results.recommendation_reasons?.length > 0) {
        insights.push(results.recommendation_reasons[0]);
      }
      break;
      
    case 'preferences':
      if (results.favorite_activities?.length > 0) {
        insights.push(`User enjoys ${results.favorite_activities.slice(0, 2).join(' and ')}`);
      }
      break;
  }
  
  return insights;
}