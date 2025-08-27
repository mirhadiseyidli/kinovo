// MongoDB Atlas Vector Search Service
import EventEmbeddings from '../../database/schemas/eventEmbeddingsSchema.js';
import UserEmbeddings from '../../database/schemas/userEmbeddingsSchema.js';

/**
 * Search for similar events using vector similarity
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Object[]>} - Array of similar events with scores
 */
async function searchSimilarEvents(queryEmbedding, options = {}) {
  const {
    limit = 10,
    minScore = 0.7,
    userId = null,
    visibility = ['public'],
    timeRange = null,
    excludeEventIds = [],
  } = options;

  try {
    // Build the aggregation pipeline for vector search
    const pipeline = [
      {
        $vectorSearch: {
          index: 'event_vector_search', // Atlas Vector Search index name from setupVectorSearch.js
          path: 'combined_embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10, // MongoDB recommends 10x the limit
          limit: limit * 2, // Get more results to filter
        }
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          score: { $gte: minScore },
          ...(excludeEventIds.length > 0 && {
            event: { $nin: excludeEventIds }
          }),
          'metadata.visibility': { $in: visibility },
          ...(timeRange && {
            'metadata.start_time': {
              $gte: timeRange.start,
              $lte: timeRange.end,
            }
          }),
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventDetails'
        }
      },
      {
        $unwind: '$eventDetails'
      },
      {
        $project: {
          event: '$eventDetails',
          score: 1,
          metadata: 1,
          searchable_content: 1,
        }
      },
      {
        $limit: limit
      }
    ];

    const results = await EventEmbeddings.aggregate(pipeline);
    
    return results.map(result => ({
      event: result.event,
      similarity_score: result.score,
      metadata: result.metadata,
      relevance_reason: determineRelevanceReason(result.searchable_content, queryEmbedding),
    }));
    
  } catch (error) {
    console.error('Vector search failed:', error);
    throw new Error(`Event vector search failed: ${error.message}`);
  }
}

/**
 * Search for users with similar preferences
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {Object} options - Search options
 * @returns {Promise<Object[]>} - Array of similar users with scores
 */
async function searchSimilarUsers(queryEmbedding, options = {}) {
  const {
    limit = 5,
    minScore = 0.6,
    excludeUserIds = [],
    interests = [],
  } = options;

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: 'user_vector_search', // Atlas Vector Search index name from setupVectorSearch.js
          path: 'profile_embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit: limit * 2,
        }
      },
      {
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      },
      {
        $match: {
          score: { $gte: minScore },
          ...(excludeUserIds.length > 0 && {
            user: { $nin: excludeUserIds }
          }),
          ...(interests.length > 0 && {
            'metadata.favorite_activities': { $in: interests }
          }),
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          user: '$userDetails',
          score: 1,
          metadata: 1,
          event_summary: 1,
        }
      },
      {
        $limit: limit
      }
    ];

    const results = await UserEmbeddings.aggregate(pipeline);
    
    return results.map(result => ({
      user: result.user,
      similarity_score: result.score,
      event_summary: result.event_summary,
      common_interests: result.metadata.favorite_activities,
    }));
    
  } catch (error) {
    console.error('User vector search failed:', error);
    throw new Error(`User vector search failed: ${error.message}`);
  }
}

/**
 * Get contextual information for a user (for RAG)
 * @param {string} userId - User ID
 * @param {string} query - User's query/intent
 * @param {Object} options - Context options
 * @returns {Promise<Object>} - Contextual information
 */
async function getUserContext(userId, query = '', options = {}) {
  const {
    includeEventHistory = true,
    includePreferences = true,
    includeSocialContext = true,
    maxEvents = 10,
  } = options;

  try {
    // Get user embedding profile
    const userEmbedding = await UserEmbeddings.findOne({ user: userId })
      .populate('user', 'first_name favorite_activities location');

    if (!userEmbedding) {
      return {
        user_preferences: [],
        recent_events: [],
        social_context: {},
        interests: [],
      };
    }

    const context = {
      user_preferences: userEmbedding.metadata.favorite_activities || [],
      interests: userEmbedding.searchable_content.interests_text || '',
      activity_level: userEmbedding.metadata.social_activity_level || 'medium',
    };

    // Get recent event history if requested
    if (includeEventHistory) {
      // Check if user has valid event preferences embedding
      if (userEmbedding.event_preferences_embedding && userEmbedding.event_preferences_embedding.length > 0) {
        const recentEvents = await searchSimilarEvents(
          userEmbedding.event_preferences_embedding,
          {
            limit: maxEvents,
            userId,
            visibility: ['public', 'private', 'selected'],
            timeRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
              end: new Date(),
            },
          }
        );
        
        context.recent_events = recentEvents.map(result => ({
          title: result.event.title,
          category: result.event.category,
          date: result.event.start_time,
          relevance: result.similarity_score,
        }));
      } else {
        // If no valid embedding, provide empty recent events
        // console.log(`No valid event_preferences_embedding found for user ${userId}`);
        context.recent_events = [];
      }
    }

    // Get social context if requested
    if (includeSocialContext) {
      context.social_context = {
        attendance_rate: userEmbedding.metadata.event_attendance_rate,
        total_events_created: userEmbedding.event_summary.total_events_created,
        total_events_attended: userEmbedding.event_summary.total_events_attended,
        most_common_categories: userEmbedding.event_summary.most_common_categories,
      };
    }

    return context;
    
  } catch (error) {
    console.error('Failed to get user context:', error);
    return {
      user_preferences: [],
      recent_events: [],
      social_context: {},
      interests: [],
    };
  }
}

/**
 * Search for events relevant to a user's query with personalization
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Personalized search results with context
 */
async function personalizedEventSearch(userId, query, options = {}) {
  const { generateEmbedding } = await import('./embeddings.js');
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get user context for personalization
    const userContext = await getUserContext(userId, query);
    
    // Search for similar events
    const events = await searchSimilarEvents(queryEmbedding, {
      ...options,
      userId,
    });

    // Get personalized recommendations based on user preferences
    const userEmbedding = await UserEmbeddings.findOne({ user: userId });
    let personalizedEvents = [];
    
    if (userEmbedding && userEmbedding.profile_embedding.length > 0) {
      personalizedEvents = await searchSimilarEvents(
        userEmbedding.profile_embedding,
        {
          limit: 5,
          minScore: 0.6,
          userId,
          visibility: ['public'],
        }
      );
    }

    return {
      query_results: events,
      personalized_recommendations: personalizedEvents,
      user_context: userContext,
      total_results: events.length,
    };
    
  } catch (error) {
    console.error('Personalized search failed:', error);
    throw new Error(`Personalized event search failed: ${error.message}`);
  }
}

/**
 * Determine why an event is relevant (for explainability)
 * @param {Object} searchableContent - Event searchable content
 * @param {number[]} queryEmbedding - Query embedding
 * @returns {string} - Relevance reason
 */
function determineRelevanceReason(searchableContent, queryEmbedding) {
  // Simple heuristic - in a production system, you'd analyze the embeddings more deeply
  const content = searchableContent;
  
  if (content.category) {
    return `Similar category: ${content.category}`;
  }
  
  if (content.location_text) {
    return `Same location: ${content.location_text}`;
  }
  
  return 'Similar to your interests';
}

export {
  searchSimilarEvents,
  searchSimilarUsers,
  getUserContext,
  personalizedEventSearch,
};