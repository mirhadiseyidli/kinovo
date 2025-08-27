/**
 * Middleware for automatic embedding generation
 * Generates embeddings automatically when events or users are created/updated
 */

const { generateEventEmbeddings, generateUserEmbeddings } = require('../scripts/indexDataForVectorSearch');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');

/**
 * Generate embeddings for a newly created or updated event
 * @param {Object} event - The event document
 * @param {boolean} isUpdate - Whether this is an update operation
 */
async function generateEventEmbeddingAsync(event, isUpdate = false) {
  try {
    // Skip if in development mode and auto-embedding is disabled
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
      return;
    }

    // Generate embedding in background (non-blocking)
    setImmediate(async () => {
      try {
        const embeddingData = await generateEventEmbeddings(event);
        
        if (embeddingData) {
          // Update or create embedding
          await EventEmbeddings.findOneAndUpdate(
            { event: event._id },
            embeddingData,
            { upsert: true, new: true }
          );
          
          // console.log(`✅ Event embedding ${isUpdate ? 'updated' : 'created'} for ${event._id}`);
        }
      } catch (error) {
        console.error(`Failed to generate event embedding:`, error.message);
      }
    });
  } catch (error) {
    console.error('Event embedding middleware error:', error);
  }
}

/**
 * Generate embeddings for a newly created or updated user
 * @param {Object} user - The user document
 * @param {boolean} isUpdate - Whether this is an update operation
 */
async function generateUserEmbeddingAsync(user, isUpdate = false) {
  try {
    // Skip if in development mode and auto-embedding is disabled
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
      return;
    }

    // Generate embedding in background (non-blocking)
    setImmediate(async () => {
      try {
        const embeddingData = await generateUserEmbeddings(user);
        
        if (embeddingData) {
          // Update or create embedding
          await UserEmbeddings.findOneAndUpdate(
            { user: user._id },
            embeddingData,
            { upsert: true, new: true }
          );
          
          // console.log(`✅ User embedding ${isUpdate ? 'updated' : 'created'} for ${user._id}`);
        }
      } catch (error) {
        console.error(`Failed to generate user embedding:`, error.message);
      }
    });
  } catch (error) {
    console.error('User embedding middleware error:', error);
  }
}

/**
 * Mark an embedding as needing update (for batch processing later)
 * More efficient for high-traffic scenarios
 */
async function markEmbeddingForUpdate(collection, documentId) {
  try {
    if (collection === 'events') {
      await EventEmbeddings.findOneAndUpdate(
        { event: documentId },
        { needs_embedding_update: true, updated_at: new Date() },
        { upsert: true }
      );
    } else if (collection === 'users') {
      await UserEmbeddings.findOneAndUpdate(
        { user: documentId },
        { needs_embedding_update: true, updated_at: new Date() },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Failed to mark embedding for update:', error);
  }
}

module.exports = {
  generateEventEmbeddingAsync,
  generateUserEmbeddingAsync,
  markEmbeddingForUpdate
};