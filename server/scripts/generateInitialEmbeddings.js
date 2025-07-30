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
  console.log('🎯 Generating event embeddings...');
  
  const events = await Events.find({}).lean();
  console.log(`Found ${events.length} events to process`);
  
  if (events.length === 0) {
    console.log('No events found to process');
    return;
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const event of events) {
    try {
      // Check if embedding already exists
      const existingEmbedding = await EventEmbeddings.findOne({ event: event._id });
      if (existingEmbedding) {
        console.log(`⏭️  Skipping event ${event._id} - embedding already exists`);
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
      
      console.log(`✅ Processed event: ${titleText} (${processed}/${events.length})`);
      
      // Rate limiting to avoid API limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing event ${event._id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`🎉 Event embeddings complete: ${processed} processed, ${errors} errors`);
}

async function generateUserEmbeddings() {
  console.log('👤 Generating user embeddings...');
  
  const users = await Users.find({}).lean();
  console.log(`Found ${users.length} users to process`);
  
  if (users.length === 0) {
    console.log('No users found to process');
    return;
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      // Check if embedding already exists
      const existingEmbedding = await UserEmbeddings.findOne({ user: user._id });
      if (existingEmbedding) {
        console.log(`⏭️  Skipping user ${user._id} - embedding already exists`);
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
      
      console.log(`✅ Processed user: ${user.full_name || user.username} (${processed}/${users.length})`);
      
      // Rate limiting to avoid API limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing user ${user._id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`🎉 User embeddings complete: ${processed} processed, ${errors} errors`);
}

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Check if we have OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    // Generate embeddings
    await generateEventEmbeddings();
    await generateUserEmbeddings();
    
    console.log('🎊 All embeddings generated successfully!');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateEventEmbeddings, generateUserEmbeddings };