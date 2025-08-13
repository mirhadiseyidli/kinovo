/**
 * Database hooks for automatic embedding generation
 * These hooks automatically generate embeddings when documents are created or updated
 */

const { generateEventEmbeddings, generateUserEmbeddings } = require('../../scripts/indexDataForVectorSearch');
const EventEmbeddings = require('../schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../schemas/userEmbeddingsSchema');

/**
 * Setup post-save hook for Events schema
 * Automatically generates embeddings when an event is created or updated
 */
function setupEventEmbeddingHooks(EventsSchema) {
  // Post-save hook for new events
  EventsSchema.post('save', async function(doc) {
    try {
      // Skip if auto-embeddings are disabled
      if (process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
        return;
      }

      // Generate embedding asynchronously
      process.nextTick(async () => {
        try {
          const embeddingData = await generateEventEmbeddings(doc.toObject());
          
          if (embeddingData) {
            await EventEmbeddings.findOneAndUpdate(
              { event: doc._id },
              embeddingData,
              { upsert: true, new: true }
            );
            console.log(`✅ Event embedding created for ${doc._id}`);
          }
        } catch (error) {
          console.error(`Failed to generate event embedding for ${doc._id}:`, error.message);
        }
      });
    } catch (error) {
      console.error('Event post-save hook error:', error);
    }
  });

  // Post-update hook for updated events
  EventsSchema.post('findOneAndUpdate', async function() {
    try {
      const doc = await this.model.findOne(this.getQuery());
      if (!doc) return;

      // Skip if auto-embeddings are disabled
      if (process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
        return;
      }

      // Mark embedding for update (batch processing later)
      await EventEmbeddings.findOneAndUpdate(
        { event: doc._id },
        { 
          needs_embedding_update: true,
          updated_at: new Date()
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Event update hook error:', error);
    }
  });
}

/**
 * Setup post-save hook for Users schema
 * Automatically generates embeddings when a user is created or updated
 */
function setupUserEmbeddingHooks(UsersSchema) {
  // Post-save hook for new users
  UsersSchema.post('save', async function(doc) {
    try {
      // Skip if auto-embeddings are disabled
      if (process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
        return;
      }

      // Generate embedding asynchronously
      process.nextTick(async () => {
        try {
          const embeddingData = await generateUserEmbeddings(doc.toObject());
          
          if (embeddingData) {
            await UserEmbeddings.findOneAndUpdate(
              { user: doc._id },
              embeddingData,
              { upsert: true, new: true }
            );
            console.log(`✅ User embedding created for ${doc._id}`);
          }
        } catch (error) {
          console.error(`Failed to generate user embedding for ${doc._id}:`, error.message);
        }
      });
    } catch (error) {
      console.error('User post-save hook error:', error);
    }
  });

  // Post-update hook for updated users
  UsersSchema.post('findOneAndUpdate', async function() {
    try {
      const doc = await this.model.findOne(this.getQuery());
      if (!doc) return;

      // Skip if auto-embeddings are disabled
      if (process.env.DISABLE_AUTO_EMBEDDINGS === 'true') {
        return;
      }

      // Mark embedding for update (batch processing later)
      await UserEmbeddings.findOneAndUpdate(
        { user: doc._id },
        { 
          needs_embedding_update: true,
          updated_at: new Date()
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('User update hook error:', error);
    }
  });
}

module.exports = {
  setupEventEmbeddingHooks,
  setupUserEmbeddingHooks
};