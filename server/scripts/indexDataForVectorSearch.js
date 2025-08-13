#!/usr/bin/env node

/**
 * Index Existing Data for Vector Search
 * 
 * This script generates embeddings for existing events and users
 * and populates the EventEmbeddings and UserEmbeddings collections.
 */

require('dotenv').config();
const { connectToDatabase } = require('../database/connection');
const { generateEmbedding } = require('../services/vectorSearchService');

// Schema imports
const Events = require('../database/schemas/eventsSchema');
const Users = require('../database/schemas/usersSchema');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');

/**
 * Generate embeddings for a single event
 */
async function generateEventEmbeddings(event) {
  try {
    // Create searchable content
    const searchableContent = {
      title: event.title || '',
      description: event.description || '',
      category: event.category || event.event_type || '',
      location_text: event.location?.text || event.location?.name || '',
    };

    // Create combined text for embedding
    const titleText = searchableContent.title;
    const descriptionText = searchableContent.description;
    const categoryText = searchableContent.category;
    const locationText = searchableContent.location_text;
    
    const combinedText = [titleText, descriptionText, categoryText, locationText]
      .filter(text => text.trim().length > 0)
      .join(' ');

    if (!combinedText.trim()) {
      return null;
    }

    // Generate embeddings
    const [titleEmbedding, combinedEmbedding] = await Promise.all([
      generateEmbedding(titleText),
      generateEmbedding(combinedText),
    ]);

    // Generate category and description embeddings if content exists
    const categoryEmbedding = categoryText ? await generateEmbedding(categoryText) : [];
    const descriptionEmbedding = descriptionText ? await generateEmbedding(descriptionText) : [];
    const locationEmbedding = locationText ? await generateEmbedding(locationText) : [];

    // Create metadata
    const metadata = {
      event_type: event.category || event.event_type,
      visibility: event.visibility || 'public',
      start_time: event.start_time,
      end_time: event.end_time,
      location: {
        text: event.location?.text || event.location?.name || '',
        city: event.location?.city || '',
        state: event.location?.state || '',
        coordinates: {
          lat: event.location?.coordinates?.lat || event.location?.lat || 0,
          lng: event.location?.coordinates?.lng || event.location?.lng || 0,
        },
      },
      attendee_count: event.attendees?.length || 0,
      creator_id: event.creator,
    };

    return {
      event: event._id,
      title_embedding: titleEmbedding,
      description_embedding: descriptionEmbedding,
      category_embedding: categoryEmbedding,
      combined_embedding: combinedEmbedding,
      location_embedding: locationEmbedding,
      metadata,
      searchable_content: searchableContent,
      embedding_version: '1.0',
    };

  } catch (error) {
    console.error(`Error generating embeddings for event ${event._id}:`, error.message);
    return null;
  }
}

/**
 * Generate embeddings for a single user
 */
async function generateUserEmbeddings(user) {
  try {
    // Create searchable content from user profile
    const interests = user.favorite_activities || [];
    const bioText = user.bio || '';
    
    // Build interests text
    const interestsText = interests.join(', ');
    
    // Create combined profile text
    const profileParts = [
      bioText,
      interestsText,
      user.full_name || user.username || '',
    ].filter(text => text.trim().length > 0);

    const combinedProfileText = profileParts.join(' ');

    if (!combinedProfileText.trim()) {
      return null;
    }

    // Generate embeddings
    const profileEmbedding = await generateEmbedding(combinedProfileText);
    const interestsEmbedding = interestsText ? await generateEmbedding(interestsText) : [];
    const bioEmbedding = bioText ? await generateEmbedding(bioText) : [];

    // Create metadata
    const metadata = {
      favorite_activities: interests,
      preferred_locations: [], // TODO: Extract from user's event history
      event_attendance_rate: 0, // TODO: Calculate from event history
      social_activity_level: 'medium', // Default value
      last_activity: user.last_active || new Date(),
    };

    // Create searchable content
    const searchableContent = {
      interests_text: interestsText,
      bio_text: bioText,
      activity_summary: `User interested in: ${interestsText}`,
      social_summary: `Active user with ${interests.length} interests`,
    };

    // Initialize event summary (can be updated later with actual data)
    const eventSummary = {
      total_events_created: 0,
      total_events_attended: 0,
      most_common_categories: interests.slice(0, 3), // Use interests as starting point
      typical_event_time: 'evening',
      preferred_event_duration: 'medium',
    };

    return {
      user: user._id,
      interests_embedding: interestsEmbedding,
      bio_embedding: bioEmbedding,
      event_preferences_embedding: [], // Will be populated later based on event history
      social_pattern_embedding: [], // Will be populated later based on social interactions
      profile_embedding: profileEmbedding,
      location_preferences_embedding: [], // Will be populated later
      metadata,
      event_summary: eventSummary,
      searchable_content: searchableContent,
      recent_searches: [],
      conversation_topics: [],
      embedding_version: '1.0',
      needs_embedding_update: false,
    };

  } catch (error) {
    console.error(`Error generating embeddings for user ${user._id}:`, error.message);
    return null;
  }
}

/**
 * Index events in batches
 * @param {Object} options - Indexing options
 * @param {boolean} options.skipConnection - Skip database connection if already connected
 */
async function indexEvents(options = {}) {
  const { batchSize = 10, limit = null, skipExisting = true, skipConnection = false } = options;

  try {

    // Get total count
    const totalEvents = await Events.countDocuments();

    if (skipExisting) {
      const existingCount = await EventEmbeddings.countDocuments();
    }

    let processed = 0;
    let successful = 0;
    let skipped = 0;

    // Process in batches
    const actualLimit = limit || totalEvents;
    const batches = Math.ceil(actualLimit / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const skip = batch * batchSize;
      const events = await Events.find({})
        .skip(skip)
        .limit(batchSize)
        .lean();

      for (const event of events) {
        try {
          // Check if already exists
          if (skipExisting) {
            const existing = await EventEmbeddings.findOne({ event: event._id });
            if (existing) {
              skipped++;
              continue;
            }
          }

          // Generate embeddings
          const embeddingData = await generateEventEmbeddings(event);
          if (!embeddingData) {
            processed++;
            continue;
          }

          // Save to database
          await EventEmbeddings.findOneAndUpdate(
            { event: event._id },
            embeddingData,
            { upsert: true, new: true }
          );

          successful++;
          process.stdout.write(`✅ ${successful} `);

        } catch (error) {
          console.error(`\\n❌ Failed to process event ${event._id}:`, error.message);
        }

        processed++;
      }

      // Small delay between batches to avoid rate limiting
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error('❌ Event indexing failed:', error);
    throw error;
  }
}

/**
 * Index users in batches
 * @param {Object} options - Indexing options
 * @param {boolean} options.skipConnection - Skip database connection if already connected
 */
async function indexUsers(options = {}) {
  const { batchSize = 10, limit = null, skipExisting = true, skipConnection = false } = options;

  try {

    // Get total count
    const totalUsers = await Users.countDocuments();

    if (skipExisting) {
      const existingCount = await UserEmbeddings.countDocuments();
    }

    let processed = 0;
    let successful = 0;
    let skipped = 0;

    // Process in batches
    const actualLimit = limit || totalUsers;
    const batches = Math.ceil(actualLimit / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const skip = batch * batchSize;
      const users = await Users.find({})
        .skip(skip)
        .limit(batchSize)
        .lean();

      for (const user of users) {
        try {
          // Check if already exists
          if (skipExisting) {
            const existing = await UserEmbeddings.findOne({ user: user._id });
            if (existing) {
              skipped++;
              continue;
            }
          }

          // Generate embeddings
          const embeddingData = await generateUserEmbeddings(user);
          if (!embeddingData) {
            processed++;
            continue;
          }

          // Save to database
          await UserEmbeddings.findOneAndUpdate(
            { user: user._id },
            embeddingData,
            { upsert: true, new: true }
          );

          successful++;
          process.stdout.write(`✅ ${successful} `);

        } catch (error) {
          console.error(`\\n❌ Failed to process user ${user._id}:`, error.message);
        }

        processed++;
      }

      // Small delay between batches to avoid rate limiting
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer delay for users
      }
    }

  } catch (error) {
    console.error('❌ User indexing failed:', error);
    throw error;
  }
}

/**
 * Show indexing status
 * @param {boolean} skipConnection - Skip database connection if already connected
 */
async function showStatus(skipConnection = false) {
  try {
    // Only connect if not already connected and not skipping
    if (!skipConnection) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        await connectToDatabase();
      }
    }

    const [totalEvents, totalUsers, eventEmbeddings, userEmbeddings] = await Promise.all([
      Events.countDocuments(),
      Users.countDocuments(),
      EventEmbeddings.countDocuments(),
      UserEmbeddings.countDocuments(),
    ]);

    // Show recent embeddings
    const recentEventEmbeddings = await EventEmbeddings.find({})
      .sort({ created_at: -1 })
      .limit(3)
      .populate('event', 'title category');

    const recentUserEmbeddings = await UserEmbeddings.find({})
      .sort({ created_at: -1 })
      .limit(3)
      .populate('user', 'full_name username');

  } catch (error) {
    console.error('❌ Status check failed:', error);
    throw error;
  } finally {
    // Only exit if running as standalone script
    if (require.main === module && !skipConnection) {
      process.exit(0);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    // Only connect if running as standalone
    if (require.main === module) {
      await connectToDatabase();
    }

    switch (command) {
      case 'events':
        const eventOptions = {
          batchSize: parseInt(args[1]) || 10,
          limit: args[2] ? parseInt(args[2]) : null,
          skipExisting: args[3] !== 'force',
        };
        await indexEvents({ ...eventOptions, skipConnection: false });
        break;

      case 'users':
        const userOptions = {
          batchSize: parseInt(args[1]) || 10,
          limit: args[2] ? parseInt(args[2]) : null,
          skipExisting: args[3] !== 'force',
        };
        await indexUsers({ ...userOptions, skipConnection: false });
        break;

      case 'all':
        await indexEvents({ batchSize: 5, skipExisting: true, skipConnection: false });
        await indexUsers({ batchSize: 5, skipExisting: true, skipConnection: false });
        break;

      case 'status':
        await showStatus();
        return;

      default:
        break;
    }

  } catch (error) {
    console.error('❌ Indexing failed:', error);
  } finally {
    if (command !== 'status') {
      process.exit(0);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateEventEmbeddings,
  generateUserEmbeddings,
  indexEvents,
  indexUsers,
  showStatus,
};