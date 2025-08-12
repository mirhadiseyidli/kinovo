/**
 * Vector Search Service for RAG (Retrieval-Augmented Generation)
 * 
 * This service handles semantic search using MongoDB Atlas Vector Search
 * to provide context for AI assistant responses.
 */

const { embed } = require('ai');
const { openai } = require('@ai-sdk/openai');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');
const AIConversation = require('../database/schemas/aiConversationsSchema');

/**
 * Generate embeddings for text using Vercel AI SDK
 */
async function generateEmbedding(text) {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'), // More cost-effective than ada-002
      value: text.substring(0, 8000), // Limit input length
    });
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Search for similar events using vector search (Atlas) or fallback (local)
 */
async function searchSimilarEvents(query, userId, options = {}) {
  const {
    limit = 10,
    includePrivate = false,
    includeExpired = false,
    categoryFilter = null,
    locationFilter = null,
  } = options;

  try {
    // Check if we're in an environment that supports vector search
    const isAtlasEnvironment = process.env.MONGODB_URI?.includes('mongodb+srv://');
    
    if (!isAtlasEnvironment) {
      return await fallbackEventSearch(query, userId, options);
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter conditions
    const filter = {};
    
    if (!includePrivate) {
      filter['metadata.visibility'] = { $in: ['public', 'selected'] };
    }
    
    if (!includeExpired) {
      filter['metadata.start_time'] = { $gte: new Date() };
    }
    
    if (categoryFilter) {
      filter['metadata.event_type'] = categoryFilter;
    }

    // Vector search pipeline
    const pipeline = [
      {
        $vectorSearch: {
          index: 'event_vector_search',
          path: 'combined_embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(limit * 15, 150), // Oversampling for better results
          limit: limit,
          ...(Object.keys(filter).length > 0 && { filter }),
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event_details',
        },
      },
      {
        $unwind: '$event_details',
      },
      {
        $addFields: {
          similarity_score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $project: {
          event_details: 1,
          searchable_content: 1,
          metadata: 1,
          similarity_score: 1,
        },
      },
    ];

    const results = await EventEmbeddings.aggregate(pipeline);
    
    return results;
    
  } catch (error) {
    console.error('Vector search for events failed:', error);
    return await fallbackEventSearch(query, userId, options);
  }
}

/**
 * Fallback search for local development (text-based)
 */
async function fallbackEventSearch(query, userId, options = {}) {
  const { limit = 10, includePrivate = false, includeExpired = false } = options;
  
  try {
    const Events = require('../database/schemas/eventsSchema');
    
    // Build match conditions
    const matchConditions = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { event_type: { $regex: query, $options: 'i' } },
      ],
    };
    
    if (!includePrivate) {
      matchConditions.visibility = { $in: ['public', 'selected'] };
    }
    
    if (!includeExpired) {
      matchConditions.start_time = { $gte: new Date() };
    }

    const events = await Events.find(matchConditions)
      .limit(limit)
      .sort({ start_time: 1 })
      .lean();

    // Transform to match vector search result format
    const results = events.map(event => ({
      event_details: event,
      searchable_content: {
        title: event.title,
        description: event.description,
        category: event.category || event.event_type,
        location_text: event.location?.text || event.location?.name || '',
      },
      metadata: {
        visibility: event.visibility,
        start_time: event.start_time,
        end_time: event.end_time,
        creator_id: event.creator,
      },
      similarity_score: 0.8, // Mock similarity score
    }));
    
    return results;
    
  } catch (error) {
    console.error('Fallback event search failed:', error);
    return [];
  }
}

/**
 * Search for similar users (for social recommendations)
 */
async function searchSimilarUsers(userId, options = {}) {
  const { limit = 5, excludeSelf = true } = options;

  try {
    // Get current user's profile embedding
    const userEmbedding = await UserEmbeddings.findOne({ user: userId });
    if (!userEmbedding || !userEmbedding.profile_embedding.length) {
      return [];
    }

    // Build filter
    const filter = {};
    if (excludeSelf) {
      filter['user'] = { $ne: userId };
    }

    const pipeline = [
      {
        $vectorSearch: {
          index: 'user_vector_search',
          path: 'profile_embedding',
          queryVector: userEmbedding.profile_embedding,
          numCandidates: Math.max(limit * 10, 50),
          limit: limit,
          filter,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user_details',
        },
      },
      {
        $unwind: '$user_details',
      },
      {
        $addFields: {
          similarity_score: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $project: {
          'user_details.full_name': 1,
          'user_details.username': 1,
          'user_details.profile_picture': 1,
          metadata: 1,
          searchable_content: 1,
          similarity_score: 1,
        },
      },
    ];

    const results = await UserEmbeddings.aggregate(pipeline);
    return results;
    
  } catch (error) {
    console.error('Vector search for users failed:', error);
    return [];
  }
}

/**
 * Get personalized event recommendations using combined search
 */
async function getPersonalizedEventRecommendations(userId, query = '', options = {}) {
  const { limit = 10 } = options;

  try {
    // Check if we're in an environment that supports vector search
    const isAtlasEnvironment = process.env.MONGODB_URI?.includes('mongodb+srv://');
    
    if (!isAtlasEnvironment) {
      return await searchSimilarEvents(query, userId, options);
    }

    // Get user's preferences and event history
    const userEmbedding = await UserEmbeddings.findOne({ user: userId }).populate('user');
    if (!userEmbedding) {
      // Fallback to regular search if no user embedding
      return await searchSimilarEvents(query, userId, options);
    }

    // If query is provided, search for events similar to query
    let queryResults = [];
    if (query.trim()) {
      queryResults = await searchSimilarEvents(query, userId, { 
        ...options, 
        limit: Math.ceil(limit * 0.7) // 70% based on query
      });
    }

    // Search for events similar to user's preferences
    const userPreferenceEmbedding = userEmbedding.event_preferences_embedding;
    let preferenceResults = [];
    
    if (userPreferenceEmbedding && userPreferenceEmbedding.length > 0) {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'event_vector_search',
            path: 'combined_embedding',
            queryVector: userPreferenceEmbedding,
            numCandidates: 100,
            limit: Math.ceil(limit * 0.5), // 50% based on preferences
            filter: {
              'metadata.visibility': { $in: ['public', 'selected'] },
              'metadata.start_time': { $gte: new Date() },
            },
          },
        },
        {
          $lookup: {
            from: 'events',
            localField: 'event',
            foreignField: '_id',
            as: 'event_details',
          },
        },
        {
          $unwind: '$event_details',
        },
        {
          $addFields: {
            similarity_score: { $meta: 'vectorSearchScore' },
            recommendation_type: 'user_preference',
          },
        },
        {
          $project: {
            event_details: 1,
            searchable_content: 1,
            metadata: 1,
            similarity_score: 1,
            recommendation_type: 1,
          },
        },
      ];

      preferenceResults = await EventEmbeddings.aggregate(pipeline);
    }

    // Combine and deduplicate results
    const combinedResults = [...queryResults, ...preferenceResults];
    const uniqueResults = combinedResults.reduce((acc, current) => {
      const existingItem = acc.find(item => 
        item.event_details._id.toString() === current.event_details._id.toString()
      );
      
      if (!existingItem) {
        acc.push(current);
      } else if (current.similarity_score > existingItem.similarity_score) {
        // Replace with higher scoring result
        const index = acc.indexOf(existingItem);
        acc[index] = current;
      }
      
      return acc;
    }, []);

    // Sort by similarity score and limit
    const finalResults = uniqueResults
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    return finalResults;
    
  } catch (error) {
    console.error('Personalized recommendations failed:', error);
    // Fallback to regular search
    return await searchSimilarEvents(query, userId, options);
  }
}

/**
 * Search conversation history for similar topics
 */
async function searchConversationHistory(userId, query, options = {}) {
  const { limit = 5 } = options;

  try {
    // Use MongoDB text search (not vector search for conversations yet)
    const searchResults = await AIConversation.aggregate([
      {
        $match: {
          userId: userId,
          isActive: true,
          $text: { $search: query },
        },
      },
      {
        $addFields: {
          relevance_score: { $meta: 'textScore' },
        },
      },
      {
        $sort: { relevance_score: { $meta: 'textScore' } },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          conversationId: 1,
          title: 1,
          messages: { $slice: ['$messages', -3] }, // Last 3 messages
          relevance_score: 1,
          updatedAt: 1,
        },
      },
    ]);

    return searchResults;
    
  } catch (error) {
    console.error('Conversation search failed:', error);
    return [];
  }
}

/**
 * Build RAG context for AI assistant
 */
async function buildRAGContext(userId, query, options = {}) {
  const {
    includeEvents = true,
    includeUsers = false,
    includeConversations = true,
    maxEvents = 5,
    maxUsers = 3,
    maxConversations = 2,
  } = options;

  const context = {
    query,
    userId,
    timestamp: new Date(),
    sources: [],
  };

  try {
    // Get relevant events
    if (includeEvents) {
      const events = await getPersonalizedEventRecommendations(userId, query, {
        limit: maxEvents,
      });
      
      if (events.length > 0) {
        context.sources.push({
          type: 'events',
          count: events.length,
          data: events.map(e => ({
            id: e.event_details._id,
            title: e.searchable_content.title,
            description: e.searchable_content.description,
            category: e.searchable_content.category,
            location: e.searchable_content.location_text,
            start_time: e.metadata.start_time,
            similarity_score: e.similarity_score,
          })),
        });
      }
    }

    // Get similar users (for social features)
    if (includeUsers) {
      const users = await searchSimilarUsers(userId, { limit: maxUsers });
      
      if (users.length > 0) {
        context.sources.push({
          type: 'users',
          count: users.length,
          data: users.map(u => ({
            id: u.user_details._id,
            name: u.user_details.full_name,
            username: u.user_details.username,
            interests: u.metadata.favorite_activities,
            similarity_score: u.similarity_score,
          })),
        });
      }
    }

    // Get conversation history
    if (includeConversations) {
      const conversations = await searchConversationHistory(userId, query, {
        limit: maxConversations,
      });
      
      if (conversations.length > 0) {
        context.sources.push({
          type: 'conversations',
          count: conversations.length,
          data: conversations.map(c => ({
            id: c.conversationId,
            title: c.title,
            recent_messages: c.messages.map(m => ({
              role: m.role,
              content: m.content.substring(0, 200) + '...',
            })),
            relevance_score: c.relevance_score,
          })),
        });
      }
    }

    return context;
    
  } catch (error) {
    console.error('Failed to build RAG context:', error);
    return context; // Return partial context
  }
}

module.exports = {
  generateEmbedding,
  searchSimilarEvents,
  searchSimilarUsers,
  getPersonalizedEventRecommendations,
  searchConversationHistory,
  buildRAGContext,
};