// Event and User Indexing Pipeline for Vector Search
import Events from '../../database/schemas/eventsSchema.js';
import Users from '../../database/schemas/usersSchema.js';
import EventEmbeddings from '../../database/schemas/eventEmbeddingsSchema.js';
import UserEmbeddings from '../../database/schemas/userEmbeddingsSchema.js';

/**
 * Index a single event for vector search
 * @param {string} eventId - Event ID to index
 * @returns {Promise<Object>} - Indexing result
 */
async function indexEvent(eventId) {
  const { 
    generateEmbedding, 
    generateBatchEmbeddings, 
    prepareEventContent,
    combineEmbeddings 
  } = await import('./embeddings.js');

  try {
    // Get the event with populated data
    const event = await Events.findById(eventId)
      .populate('creator', 'first_name last_name')
      .populate('attendees.user', 'first_name last_name');

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Prepare content for embedding
    const content = prepareEventContent(event);
    
    // Generate embeddings for different content types
    const embeddingTexts = [
      content.title,
      content.description || content.title, // Fallback to title if no description
      content.category,
      content.combinedContent,
    ].filter(Boolean);

    const embeddings = await generateBatchEmbeddings(embeddingTexts);
    
    const [titleEmbedding, descriptionEmbedding, categoryEmbedding, combinedEmbedding] = embeddings;

    // Generate location embedding if location exists
    let locationEmbedding = [];
    if (content.locationText) {
      locationEmbedding = await generateEmbedding(content.locationText);
    }

    // Prepare metadata
    const metadata = {
      event_type: event.category,
      visibility: event.visibility,
      start_time: event.start_time,
      end_time: event.end_time,
      location: {
        text: event.location?.text || null,
        city: event.location?.city || null,
        state: event.location?.state || null,
        coordinates: event.location?.coordinates || null,
      },
      attendee_count: event.attendees?.length || 0,
      creator_id: event.creator._id,
    };

    // Prepare searchable content for RAG
    const searchableContent = {
      title: content.title,
      description: content.description || '',
      category: content.category,
      location_text: content.locationText || '',
    };

    // Update or create event embedding document
    const eventEmbedding = await EventEmbeddings.findOneAndUpdate(
      { event: eventId },
      {
        event: eventId,
        title_embedding: titleEmbedding,
        description_embedding: descriptionEmbedding,
        category_embedding: categoryEmbedding,
        combined_embedding: combinedEmbedding,
        location_embedding: locationEmbedding,
        metadata,
        searchable_content: searchableContent,
        updated_at: new Date(),
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    
    return {
      success: true,
      eventId,
      embeddingId: eventEmbedding._id,
      title: event.title,
    };

  } catch (error) {
    console.error(`❌ Failed to index event ${eventId}:`, error);
    return {
      success: false,
      eventId,
      error: error.message,
    };
  }
}

/**
 * Index a single user profile for vector search
 * @param {string} userId - User ID to index
 * @returns {Promise<Object>} - Indexing result
 */
async function indexUser(userId) {
  const { 
    generateEmbedding, 
    generateBatchEmbeddings,
    prepareUserContent,
    combineEmbeddings 
  } = await import('./embeddings.js');

  try {
    // Get user with event history
    const user = await Users.findById(userId)
      .populate('events.event', 'title category start_time')
      .populate('friends', 'first_name last_name favorite_activities');

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Prepare content for embedding
    const content = prepareUserContent(user);
    
    // Generate embeddings for different content types
    const embeddingTexts = [
      content.bio || `User interested in ${content.interests}`,
      content.interests ? `Interests: ${content.interests}` : '',
      content.activitySummary || 'Active user',
      content.profileContent,
    ].filter(Boolean);

    const embeddings = await generateBatchEmbeddings(embeddingTexts);
    
    const [bioEmbedding, interestsEmbedding, activityEmbedding, profileEmbedding] = embeddings;

    // Generate location preferences embedding
    let locationPreferencesEmbedding = [];
    if (content.location) {
      locationPreferencesEmbedding = await generateEmbedding(content.location);
    }

    // Calculate event statistics
    const acceptedEvents = user.events?.filter(e => e.status === 'accepted') || [];
    const eventCategories = acceptedEvents.map(e => e.event?.category).filter(Boolean);
    const categoryFrequency = {};
    
    eventCategories.forEach(cat => {
      categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
    });
    
    const mostCommonCategories = Object.entries(categoryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    // Prepare metadata
    const metadata = {
      favorite_activities: user.favorite_activities || [],
      preferred_locations: [user.location?.city, user.location?.state].filter(Boolean),
      event_attendance_rate: acceptedEvents.length / Math.max(user.events?.length || 1, 1),
      social_activity_level: calculateActivityLevel(user),
      last_activity: user.last_login_at || user.created_at,
    };

    // Prepare event summary
    const eventSummary = {
      total_events_created: 0, // You'd need to query Events collection for this
      total_events_attended: acceptedEvents.length,
      most_common_categories: mostCommonCategories,
      typical_event_time: determineTypicalEventTime(acceptedEvents),
      preferred_event_duration: determinePreferredDuration(acceptedEvents),
    };

    // Prepare searchable content
    const searchableContent = {
      interests_text: content.interests || '',
      bio_text: content.bio || '',
      activity_summary: content.activitySummary || '',
      social_summary: `${acceptedEvents.length} events attended, interests in ${mostCommonCategories.join(', ')}`,
    };

    // Update or create user embedding document
    const userEmbedding = await UserEmbeddings.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        interests_embedding: interestsEmbedding,
        bio_embedding: bioEmbedding,
        event_preferences_embedding: activityEmbedding,
        profile_embedding: profileEmbedding,
        location_preferences_embedding: locationPreferencesEmbedding,
        metadata,
        event_summary: eventSummary,
        searchable_content,
        updated_at: new Date(),
        last_profile_sync: new Date(),
        needs_embedding_update: false,
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    
    return {
      success: true,
      userId,
      embeddingId: userEmbedding._id,
      name: `${user.first_name} ${user.last_name}`,
    };

  } catch (error) {
    console.error(`❌ Failed to index user ${userId}:`, error);
    return {
      success: false,
      userId,
      error: error.message,
    };
  }
}

/**
 * Batch index multiple events
 * @param {string[]} eventIds - Array of event IDs
 * @param {Object} options - Batch options
 * @returns {Promise<Object>} - Batch indexing results
 */
async function batchIndexEvents(eventIds, options = {}) {
  const { batchSize = 10, delayMs = 100 } = options;
  
  const results = {
    total: eventIds.length,
    successful: 0,
    failed: 0,
    results: [],
  };

  for (let i = 0; i < eventIds.length; i += batchSize) {
    const batch = eventIds.slice(i, i + batchSize);
    
    const batchPromises = batch.map(eventId => indexEvent(eventId));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      results.results.push(result.value || { success: false, eventId: batch[index] });
    });
    
    // Add delay between batches to avoid rate limiting
    if (delayMs > 0 && i + batchSize < eventIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Index all events in the database
 * @param {Object} options - Indexing options
 * @returns {Promise<Object>} - Indexing results
 */
async function indexAllEvents(options = {}) {
  try {
    const eventIds = await Events.find({}, '_id').lean();
    const ids = eventIds.map(e => e._id.toString());
    
    return await batchIndexEvents(ids, options);
  } catch (error) {
    console.error('Failed to index all events:', error);
    throw error;
  }
}

/**
 * Index all users in the database
 * @param {Object} options - Indexing options
 * @returns {Promise<Object>} - Indexing results
 */
async function indexAllUsers(options = {}) {
  const { batchSize = 10, delayMs = 100 } = options;
  
  try {
    const userIds = await Users.find({}, '_id').lean();
    const ids = userIds.map(u => u._id.toString());
    
    const results = {
      total: ids.length,
      successful: 0,
      failed: 0,
      results: [],
    };

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      const batchPromises = batch.map(userId => indexUser(userId));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          results.successful++;
        } else {
          results.failed++;
        }
        results.results.push(result.value || { success: false, userId: batch[index] });
      });
      
      if (delayMs > 0 && i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
    
  } catch (error) {
    console.error('Failed to index all users:', error);
    throw error;
  }
}

// Helper functions
function calculateActivityLevel(user) {
  const eventsCount = user.events?.length || 0;
  const friendsCount = user.friends?.length || 0;
  
  const totalActivity = eventsCount + friendsCount;
  
  if (totalActivity >= 20) return 'high';
  if (totalActivity >= 5) return 'medium';
  return 'low';
}

function determineTypicalEventTime(events) {
  if (!events.length) return 'anytime';
  
  const hours = events.map(e => {
    if (e.event?.start_time) {
      return new Date(e.event.start_time).getHours();
    }
    return null;
  }).filter(Boolean);
  
  const avgHour = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
  
  if (avgHour < 12) return 'morning';
  if (avgHour < 17) return 'afternoon';
  return 'evening';
}

function determinePreferredDuration(events) {
  // Simple heuristic - could be enhanced with actual duration calculation
  return 'medium';
}

export {
  indexEvent,
  indexUser,
  batchIndexEvents,
  indexAllEvents,
  indexAllUsers,
};