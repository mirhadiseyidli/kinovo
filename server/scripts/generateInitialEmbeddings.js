/**
 * Generate Initial Embeddings for Existing Data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { generateEmbedding } = require('../services/vectorSearchService');

// Import schemas
const Events = require('../database/schemas/eventsSchema');
const Users = require('../database/schemas/usersSchema');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');

async function generateEventEmbeddings() {
  
  const events = await Events.find({}).lean();
  
  if (events.length === 0) {
    return;
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const event of events) {
    try {
      // Check if embedding already exists
      const existingEmbedding = await EventEmbeddings.findOne({ event: event._id });
      if (existingEmbedding) {
        continue;
      }
      
      // Prepare content for embedding
      const titleText = event.title || '';
      const descriptionText = event.description || '';
      const categoryText = event.category || event.event_type || '';
      const locationText = event.location?.text || event.location?.name || '';
      
      // Generate embeddings
      const titleEmbedding = await generateEmbedding(titleText);
      const descriptionEmbedding = descriptionText ? await generateEmbedding(descriptionText) : [];
      const categoryEmbedding = await generateEmbedding(categoryText);
      const locationEmbedding = locationText ? await generateEmbedding(locationText) : [];
      
      // Create combined embedding
      const combinedText = `${titleText} ${descriptionText} ${categoryText} ${locationText}`.trim();
      const combinedEmbedding = await generateEmbedding(combinedText);
      
      // Create embedding document
      const eventEmbedding = new EventEmbeddings({
        event: event._id,
        title_embedding: titleEmbedding,
        description_embedding: descriptionEmbedding,
        category_embedding: categoryEmbedding,
        location_embedding: locationEmbedding,
        combined_embedding: combinedEmbedding,
        metadata: {
          event_type: event.event_type || event.category,
          visibility: event.visibility,
          start_time: event.start_time,
          end_time: event.end_time,
          location: {
            text: locationText,
            city: event.location?.city,
            state: event.location?.state,
            coordinates: event.location?.coordinates,
          },
          attendee_count: event.attendees?.length || 0,
          creator_id: event.creator,
        },
        searchable_content: {
          title: titleText,
          description: descriptionText,
          category: categoryText,
          location_text: locationText,
        },
      });
      
      await eventEmbedding.save();
      processed++;
      
      
      // Rate limiting to avoid API limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing event ${event._id}:`, error.message);
      errors++;
    }
  }
  
}

async function generateUserEmbeddings() {
  
  const users = await Users.find({}).lean();
  
  if (users.length === 0) {
    return;
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      // Check if embedding already exists
      const existingEmbedding = await UserEmbeddings.findOne({ user: user._id });
      if (existingEmbedding) {
        continue;
      }
      
      // Prepare content for embedding
      const profileText = `${user.full_name || ''} ${user.username || ''} ${user.bio || ''}`.trim();
      const interestsText = user.favorite_activities?.join(' ') || '';
      const locationText = user.location?.text || '';
      
      // Generate embeddings only if we have content
      const profileEmbedding = profileText ? await generateEmbedding(profileText) : [];
      const interestsEmbedding = interestsText ? await generateEmbedding(interestsText) : [];
      const locationEmbedding = locationText ? await generateEmbedding(locationText) : [];
      
      // Create user embedding document
      const userEmbedding = new UserEmbeddings({
        user: user._id,
        profile_embedding: profileEmbedding,
        interests_embedding: interestsEmbedding,
        location_preferences_embedding: locationEmbedding,
        event_preferences_embedding: [],
        social_pattern_embedding: [],
        metadata: {
          favorite_activities: user.favorite_activities || [],
          social_activity_level: 'medium',
          location: {
            text: locationText,
            city: user.location?.city,
            state: user.location?.state,
            coordinates: user.location?.coordinates,
          },
        },
        searchable_content: {
          name: user.full_name,
          username: user.username,
          bio: user.bio || '',
          interests: interestsText,
          location_text: locationText,
        },
        needs_embedding_update: false,
      });
      
      await userEmbedding.save();
      processed++;
      
      // Rate limiting to avoid API limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing user ${user._id}:`, error.message);
      errors++;
    }
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check if we have OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    // Generate embeddings
    await generateEventEmbeddings();
    await generateUserEmbeddings();
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateEventEmbeddings, generateUserEmbeddings };