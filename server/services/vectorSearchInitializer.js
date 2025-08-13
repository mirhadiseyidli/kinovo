/**
 * Vector Search Initializer Service
 * 
 * Handles initialization and verification of MongoDB Atlas Vector Search
 * during server startup to avoid redundant database connections.
 */

const { testVectorSearch, vectorSearchIndexes } = require('../scripts/setupVectorSearch');
const { indexEvents, indexUsers, showStatus } = require('../scripts/indexDataForVectorSearch');
const { main: generateInitialEmbeddings } = require('../scripts/generateInitialEmbeddings');

/**
 * Initialize vector search capabilities
 * Called during server startup after database connection is established
 * @param {Object} options - Initialization options
 * @param {boolean} options.autoIndex - Automatically index data if needed
 */
async function initializeVectorSearch(options = {}) {
  const { autoIndex = false } = options;
  
  try {
    console.log('🔍 Initializing Vector Search capabilities...');
    
    // Check if we're in Atlas environment
    const isAtlasEnvironment = process.env.MONGODB_URI?.includes('mongodb+srv://');
    
    if (!isAtlasEnvironment) {
      console.log('ℹ️  Running in non-Atlas environment. Vector search will use fallback methods.');
      return { 
        initialized: false, 
        reason: 'Non-Atlas environment',
        fallbackEnabled: true 
      };
    }
    
    // Test vector search setup (skip connection since server already connected)
    await testVectorSearch(true);
    
    // Check if initial indexing is needed
    if (autoIndex) {
      const needsIndexing = await needsInitialIndexing();
      if (needsIndexing) {
        console.log('📊 Initial data indexing needed. Starting background indexing...');
        // Run indexing in background to not block server startup
        indexData({ 
          type: 'all', 
          batchSize: 5, 
          skipExisting: true,
          showProgress: true 
        }).catch(err => {
          console.error('Background indexing error:', err.message);
        });
      }
    }
    
    console.log('✅ Vector Search initialized successfully');
    return { 
      initialized: true,
      indexes: Object.keys(vectorSearchIndexes)
    };
    
  } catch (error) {
    console.error('⚠️  Vector Search initialization warning:', error.message);
    console.log('ℹ️  Server will continue with fallback search methods');
    
    // Don't throw - allow server to start with fallback search
    return { 
      initialized: false, 
      error: error.message,
      fallbackEnabled: true 
    };
  }
}

/**
 * Check if vector search indexes exist
 * Useful for health checks and monitoring
 */
async function checkVectorSearchHealth() {
  try {
    const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
    const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');
    
    const [eventCount, userCount] = await Promise.all([
      EventEmbeddings.countDocuments(),
      UserEmbeddings.countDocuments()
    ]);
    
    return {
      healthy: true,
      stats: {
        eventEmbeddings: eventCount,
        userEmbeddings: userCount,
        indexesConfigured: Object.keys(vectorSearchIndexes)
      }
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Index data for vector search
 * Can be called on-demand or during initialization
 * @param {Object} options - Indexing options
 * @param {string} options.type - 'events', 'users', or 'all'
 * @param {number} options.batchSize - Number of items to process in each batch
 * @param {boolean} options.skipExisting - Skip items that already have embeddings
 * @param {boolean} options.useInitialScript - Use generateInitialEmbeddings script instead of indexDataForVectorSearch
 * @returns {Promise<Object>} Indexing results
 */
async function indexData(options = {}) {
  const { 
    type = 'all', 
    batchSize = 5, 
    skipExisting = true,
    showProgress = false,
    useInitialScript = false 
  } = options;
  
  try {
    const results = {
      events: { indexed: 0, skipped: 0, failed: 0 },
      users: { indexed: 0, skipped: 0, failed: 0 }
    };
    
    // Choose which indexing method to use
    if (useInitialScript) {
      // Use the simpler generateInitialEmbeddings script
      if (showProgress) console.log('📚 Using initial embeddings generator...');
      await generateInitialEmbeddings();
    } else {
      // Use the more robust indexDataForVectorSearch script
      // Index with skipConnection=true since we're already connected
      if (type === 'events' || type === 'all') {
        if (showProgress) console.log('📚 Indexing events...');
        await indexEvents({ 
          batchSize, 
          skipExisting, 
          skipConnection: true 
        });
      }
      
      if (type === 'users' || type === 'all') {
        if (showProgress) console.log('👥 Indexing users...');
        await indexUsers({ 
          batchSize, 
          skipExisting, 
          skipConnection: true 
        });
      }
    }
    
    // Get status after indexing
    await showStatus(true);
    
    return results;
  } catch (error) {
    console.error('⚠️  Data indexing error:', error.message);
    throw error;
  }
}

/**
 * Check if initial data indexing is needed
 * @returns {Promise<boolean>} True if indexing is needed
 */
async function needsInitialIndexing() {
  try {
    const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
    const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');
    
    const [eventCount, userCount] = await Promise.all([
      EventEmbeddings.countDocuments(),
      UserEmbeddings.countDocuments()
    ]);
    
    // If either collection is empty, we need initial indexing
    return eventCount === 0 || userCount === 0;
  } catch (error) {
    return false;
  }
}

module.exports = {
  initializeVectorSearch,
  checkVectorSearchHealth,
  indexData,
  needsInitialIndexing
};