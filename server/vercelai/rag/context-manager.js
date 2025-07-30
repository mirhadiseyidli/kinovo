// RAG Context Manager for AI Agent
import { personalizedEventSearch, getUserContext } from './vector-search.js';

/**
 * Generate contextual information for AI responses
 * @param {string} userId - User ID
 * @param {string} query - User's query
 * @param {string[]} conversationHistory - Recent conversation messages
 * @returns {Promise<Object>} - Context for AI response
 */
async function generateRAGContext(userId, query, conversationHistory = []) {
  const { generateEmbedding } = await import('./embeddings.js');
  
  try {
    console.log(`🔍 Generating RAG context for user ${userId}: "${query}"`);
    
    // Get user context and preferences
    const userContext = await getUserContext(userId, query, {
      includeEventHistory: true,
      includePreferences: true,
      includeSocialContext: true,
      maxEvents: 5,
    });

    // Search for relevant events based on query
    let relevantEvents = [];
    if (query.length > 3) { // Only search if query is meaningful
      try {
        const searchResults = await personalizedEventSearch(userId, query, {
          limit: 5,
          minScore: 0.6,
          visibility: ['public', 'private', 'selected'],
        });
        
        relevantEvents = searchResults.query_results;
      } catch (searchError) {
        console.warn('Event search failed:', searchError.message);
      }
    }

    // Analyze conversation history for context
    const conversationContext = analyzeConversationHistory(conversationHistory);
    
    // Build context summary
    const contextSummary = buildContextSummary({
      userContext,
      relevantEvents,
      conversationContext,
      query,
    });

    return {
      user_context: userContext,
      relevant_events: relevantEvents.slice(0, 3), // Limit for token efficiency
      conversation_context: conversationContext,
      context_summary: contextSummary,
      personalization_insights: generatePersonalizationInsights(userContext),
    };

  } catch (error) {
    console.error('RAG context generation failed:', error);
    
    // Return minimal context on error
    return {
      user_context: {
        user_preferences: [],
        recent_events: [],
        social_context: {},
        interests: '',
      },
      relevant_events: [],
      conversation_context: {},
      context_summary: 'Limited context available.',
      personalization_insights: [],
    };
  }
}

/**
 * Build enhanced system prompt with RAG context
 * @param {string} basePrompt - Base system prompt
 * @param {Object} ragContext - RAG context from generateRAGContext
 * @returns {string} - Enhanced system prompt
 */
function buildEnhancedSystemPrompt(basePrompt, ragContext) {
  const { user_context, relevant_events, context_summary, personalization_insights, conversation_context } = ragContext;
  
  let enhancedPrompt = basePrompt + '\n\n## USER CONTEXT\n';
  
  // Add user preferences
  if (user_context.user_preferences?.length > 0) {
    enhancedPrompt += `User's favorite activities: ${user_context.user_preferences.join(', ')}\n`;
  }
  
  if (user_context.interests) {
    enhancedPrompt += `User interests: ${user_context.interests}\n`;
  }
  
  // Add recent activity context
  if (user_context.recent_events?.length > 0) {
    enhancedPrompt += `\nRecent events user has been involved with:\n`;
    user_context.recent_events.slice(0, 3).forEach((event, index) => {
      enhancedPrompt += `${index + 1}. EVENT: "${event.title}" (ID: ${event._id || event.id})\n`;
      enhancedPrompt += `   Category: ${event.category || event.event_type || 'N/A'}\n`;
      enhancedPrompt += `   Date: ${new Date(event.date || event.start_time).toLocaleDateString()}\n`;
      if (event.isUserCreator) enhancedPrompt += `   Status: User created this event\n`;
      if (event.isUserAttending) enhancedPrompt += `   Status: User attended/attending\n`;
      enhancedPrompt += `\n`;
    });
  }
  
  // Add social context
  if (user_context.social_context) {
    const social = user_context.social_context;
    enhancedPrompt += `\nUser activity level: ${user_context.activity_level || 'medium'}\n`;
    
    if (social.total_events_attended > 0) {
      enhancedPrompt += `Events attended: ${social.total_events_attended}, Created: ${social.total_events_created || 0}\n`;
    }
    
    if (social.most_common_categories?.length > 0) {
      enhancedPrompt += `Most common event categories: ${social.most_common_categories.join(', ')}\n`;
    }
  }
  
  // Add relevant events if available
  if (relevant_events?.length > 0) {
    enhancedPrompt += `\n## RELEVANT EVENTS\nEvents that might interest this user:\n`;
    relevant_events.forEach((result, index) => {
      const event = result.event;
      enhancedPrompt += `${index + 1}. EVENT: "${event.title}" (ID: ${event._id})\n`;
      enhancedPrompt += `   Category: ${event.category || event.event_type || 'N/A'}\n`;
      enhancedPrompt += `   Date: ${new Date(event.start_time).toLocaleDateString()}\n`;
      enhancedPrompt += `   Location: ${event.location?.text || 'TBD'}\n`;
      if (event.isUserCreator) enhancedPrompt += `   Status: User created this event\n`;
      if (event.isUserAttending) enhancedPrompt += `   Status: User is attending\n`;
      enhancedPrompt += `\n`;
    });
  }
  
  // Add personalization insights
  if (personalization_insights?.length > 0) {
    enhancedPrompt += `\n## PERSONALIZATION INSIGHTS\n${personalization_insights.join('\n')}\n`;
  }
  
  // Add recently mentioned events from conversation
  if (conversation_context?.mentionedEvents?.length > 0) {
    enhancedPrompt += `\n## RECENTLY MENTIONED EVENTS\n`;
    const uniqueEvents = new Map();
    
    conversation_context.mentionedEvents.forEach(event => {
      if (event.type === 'named_with_id') {
        uniqueEvents.set(event.id, { name: event.name, id: event.id });
      } else if (event.type === 'id' && !uniqueEvents.has(event.value)) {
        uniqueEvents.set(event.value, { id: event.value });
      } else if (event.type === 'named') {
        // Use name as key for named-only events
        uniqueEvents.set(`name_${event.name}`, { name: event.name });
      }
    });
    
    uniqueEvents.forEach((event, key) => {
      if (event.name && event.id) {
        enhancedPrompt += `- "${event.name}" (ID: ${event.id})\n`;
      } else if (event.id) {
        enhancedPrompt += `- Event ID: ${event.id}\n`;
      } else if (event.name) {
        enhancedPrompt += `- Event mentioned: "${event.name}"\n`;
      }
    });
    
    enhancedPrompt += `Use these event references when user says "that event" or refers back to previous discussion.\n`;
  }
  
  enhancedPrompt += `\n## RESPONSE GUIDELINES\n`;
  enhancedPrompt += `- Use the user context to provide personalized responses\n`;
  enhancedPrompt += `- Reference their interests and past activities when relevant\n`;
  enhancedPrompt += `- Suggest events that match their preferences\n`;
  enhancedPrompt += `- Be conversational and remember their activity patterns\n`;
  enhancedPrompt += `- If suggesting events, explain why they might like them based on their history\n`;
  enhancedPrompt += `- When user references "that event", check RECENTLY MENTIONED EVENTS section first\n`;
  
  return enhancedPrompt;
}

/**
 * Analyze conversation history for context patterns
 * @param {string[]} conversationHistory - Array of recent messages
 * @returns {Object} - Conversation context insights
 */
function analyzeConversationHistory(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return { topics: [], intent: 'general', urgency: 'normal', mentionedEvents: [] };
  }
  
  const recentMessages = conversationHistory.slice(-10); // Last 10 messages
  const allText = recentMessages.join(' ').toLowerCase();
  
  // Simple topic detection
  const topics = [];
  const topicKeywords = {
    'event_creation': ['create', 'new event', 'organize', 'host', 'plan'],
    'event_search': ['find', 'search', 'look for', 'discover', 'events near'],
    'weather': ['weather', 'forecast', 'rain', 'sunny', 'temperature'],
    'directions': ['directions', 'traffic', 'drive', 'route', 'navigate'],
    'social': ['friends', 'invite', 'join', 'attend', 'going'],
  };
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => allText.includes(keyword))) {
      topics.push(topic);
    }
  });
  
  // Simple intent detection
  let intent = 'general';
  if (allText.includes('create') || allText.includes('new')) intent = 'create';
  else if (allText.includes('find') || allText.includes('search')) intent = 'search';
  else if (allText.includes('help')) intent = 'help';
  
  // Simple urgency detection
  let urgency = 'normal';
  if (allText.includes('urgent') || allText.includes('asap') || allText.includes('now')) {
    urgency = 'high';
  }
  
  // Extract mentioned event IDs and names from conversation
  const mentionedEvents = [];
  const eventIdPattern = /\b[0-9a-fA-F]{24}\b/g; // MongoDB ObjectId pattern
  const fullText = conversationHistory.join('\n');
  
  // Find event IDs
  const eventIds = fullText.match(eventIdPattern);
  if (eventIds) {
    eventIds.forEach(id => {
      mentionedEvents.push({ type: 'id', value: id });
    });
  }
  
  // Find event references by common patterns
  const eventPatterns = [
    /event[:\s]+"([^"]+)"/gi,  // Event: "Name" or event "Name"
    /EVENT[:\s]+"([^"]+)"/gi,  // EVENT: "Name"
    /"([^"]+)"\s+\(ID:\s*([0-9a-fA-F]{24})\)/gi, // "Name" (ID: objectId)
  ];
  
  eventPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      if (match[2]) {
        // Pattern with both name and ID
        mentionedEvents.push({ type: 'named_with_id', name: match[1], id: match[2] });
      } else if (match[1]) {
        // Pattern with just name
        mentionedEvents.push({ type: 'named', name: match[1] });
      }
    }
  });
  
  return { topics, intent, urgency, mentionedEvents };
}

/**
 * Build a concise context summary for the AI
 * @param {Object} contextData - All context data
 * @returns {string} - Context summary
 */
function buildContextSummary({ userContext, relevantEvents, conversationContext, query }) {
  let summary = '';
  
  // User summary
  const interests = userContext.user_preferences?.slice(0, 3) || [];
  if (interests.length > 0) {
    summary += `User enjoys ${interests.join(', ')}. `;
  }
  
  // Activity level
  if (userContext.social_context?.total_events_attended > 0) {
    summary += `Has attended ${userContext.social_context.total_events_attended} events. `;
  }
  
  // Recent activity
  if (userContext.recent_events?.length > 0) {
    const recentCategories = [...new Set(userContext.recent_events.map(e => e.category))];
    summary += `Recently active in ${recentCategories.slice(0, 2).join(' and ')}. `;
  }
  
  // Query context
  if (conversationContext.intent !== 'general') {
    summary += `Currently looking to ${conversationContext.intent}. `;
  }
  
  // Relevant events
  if (relevantEvents?.length > 0) {
    summary += `Found ${relevantEvents.length} relevant events. `;
  }
  
  return summary.trim() || 'New user exploring events.';
}

/**
 * Generate personalization insights for better responses
 * @param {Object} userContext - User context data
 * @returns {string[]} - Array of insights
 */
function generatePersonalizationInsights(userContext) {
  const insights = [];
  
  // Activity pattern insights
  if (userContext.social_context?.total_events_attended > 10) {
    insights.push('This user is very active in the community and frequently attends events');
  } else if (userContext.social_context?.total_events_attended > 3) {
    insights.push('This user participates regularly in events');
  } else {
    insights.push('This user is newer to events - provide extra guidance and encouragement');
  }
  
  // Interest insights
  if (userContext.user_preferences?.length > 5) {
    insights.push('User has diverse interests - suggest variety in event types');
  } else if (userContext.user_preferences?.length > 0) {
    insights.push(`Focus on ${userContext.user_preferences[0]} related events`);
  }
  
  // Social insights
  if (userContext.activity_level === 'high') {
    insights.push('Highly social user - emphasize networking and group events');
  } else if (userContext.activity_level === 'low') {
    insights.push('Prefer smaller, intimate gatherings or solo-friendly events');
  }
  
  return insights;
}

/**
 * Limit context to fit within token constraints
 * @param {Object} ragContext - Full RAG context
 * @param {number} maxTokens - Maximum tokens to use for context
 * @returns {Object} - Truncated context
 */
function limitContextTokens(ragContext, maxTokens = 2000) {
  // Simple token estimation (rough approximation: 1 token ≈ 4 characters)
  const estimateTokens = (text) => Math.ceil(text.length / 4);
  
  let currentTokens = 0;
  const limitedContext = { ...ragContext };
  
  // Prioritize most important context
  const contextPriority = [
    'user_context.user_preferences',
    'context_summary', 
    'relevant_events',
    'personalization_insights',
    'user_context.recent_events',
  ];
  
  // Truncate less important parts if needed
  if (estimateTokens(JSON.stringify(ragContext)) > maxTokens) {
    // Keep only top 2 relevant events
    if (limitedContext.relevant_events?.length > 2) {
      limitedContext.relevant_events = limitedContext.relevant_events.slice(0, 2);
    }
    
    // Keep only top 3 recent events
    if (limitedContext.user_context?.recent_events?.length > 3) {
      limitedContext.user_context.recent_events = limitedContext.user_context.recent_events.slice(0, 3);
    }
    
    // Limit personalization insights
    if (limitedContext.personalization_insights?.length > 3) {
      limitedContext.personalization_insights = limitedContext.personalization_insights.slice(0, 3);
    }
  }
  
  return limitedContext;
}

export {
  generateRAGContext,
  buildEnhancedSystemPrompt,
  limitContextTokens,
};