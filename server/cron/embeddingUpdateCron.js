/**
 * Cron job for batch processing embedding updates
 * Runs periodically to update embeddings that have been marked for update
 */

const cron = require('node-cron');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');
const { generateEventEmbeddings, generateUserEmbeddings } = require('../scripts/indexDataForVectorSearch');

/**
 * Process pending event embedding updates
 */
async function processPendingEventEmbeddings() {
  try {
    // Find events that need embedding updates
    const pendingUpdates = await EventEmbeddings.find({ 
      needs_embedding_update: true 
    }).limit(10); // Process in batches of 10

    if (pendingUpdates.length === 0) {
      return;
    }

    console.log(`📝 Processing ${pendingUpdates.length} pending event embeddings...`);

    for (const embedding of pendingUpdates) {
      try {
        // Get the event
        const Events = require('../database/schemas/eventsSchema');
        const event = await Events.findById(embedding.event);
        
        if (!event) {
          // Remove orphaned embedding
          await EventEmbeddings.deleteOne({ _id: embedding._id });
          continue;
        }

        // Generate new embedding
        const embeddingData = await generateEventEmbeddings(event.toObject());
        
        if (embeddingData) {
          // Update embedding
          await EventEmbeddings.findByIdAndUpdate(
            embedding._id,
            {
              ...embeddingData,
              needs_embedding_update: false,
              updated_at: new Date()
            }
          );
        }
      } catch (error) {
        console.error(`Failed to update event embedding ${embedding._id}:`, error.message);
      }
    }

    console.log('✅ Event embeddings update complete');
  } catch (error) {
    console.error('Error processing pending event embeddings:', error);
  }
}

/**
 * Process pending user embedding updates
 */
async function processPendingUserEmbeddings() {
  try {
    // Find users that need embedding updates
    const pendingUpdates = await UserEmbeddings.find({ 
      needs_embedding_update: true 
    }).limit(10); // Process in batches of 10

    if (pendingUpdates.length === 0) {
      return;
    }

    console.log(`📝 Processing ${pendingUpdates.length} pending user embeddings...`);

    for (const embedding of pendingUpdates) {
      try {
        // Get the user
        const Users = require('../database/schemas/usersSchema');
        const user = await Users.findById(embedding.user);
        
        if (!user) {
          // Remove orphaned embedding
          await UserEmbeddings.deleteOne({ _id: embedding._id });
          continue;
        }

        // Generate new embedding
        const embeddingData = await generateUserEmbeddings(user.toObject());
        
        if (embeddingData) {
          // Update embedding
          await UserEmbeddings.findByIdAndUpdate(
            embedding._id,
            {
              ...embeddingData,
              needs_embedding_update: false,
              updated_at: new Date()
            }
          );
        }
      } catch (error) {
        console.error(`Failed to update user embedding ${embedding._id}:`, error.message);
      }
    }

    console.log('✅ User embeddings update complete');
  } catch (error) {
    console.error('Error processing pending user embeddings:', error);
  }
}

/**
 * Start the embedding update cron job
 * Runs every 30 minutes by default
 */
function startEmbeddingUpdateCron() {
  // Skip if disabled
  if (process.env.DISABLE_EMBEDDING_CRON === 'true') {
    console.log('ℹ️  Embedding update cron is disabled');
    return;
  }

  // Schedule: Every 30 minutes
  const schedule = process.env.EMBEDDING_UPDATE_SCHEDULE || '*/30 * * * *';
  
  const task = cron.schedule(schedule, async () => {
    console.log('🔄 Running embedding update job...');
    
    // Process both events and users in parallel
    await Promise.all([
      processPendingEventEmbeddings(),
      processPendingUserEmbeddings()
    ]);
  });

  task.start();
  console.log(`✅ Embedding update cron started (schedule: ${schedule})`);
  
  return task;
}

module.exports = {
  startEmbeddingUpdateCron,
  processPendingEventEmbeddings,
  processPendingUserEmbeddings
};