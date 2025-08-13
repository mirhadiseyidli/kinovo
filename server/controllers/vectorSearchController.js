const { indexData, checkVectorSearchHealth, needsInitialIndexing } = require('../services/vectorSearchInitializer');

/**
 * Check vector search health status
 */
const getVectorSearchHealth = async (req, res) => {
  try {
    const health = await checkVectorSearchHealth();
    const needsIndexing = await needsInitialIndexing();
    
    res.status(200).json({
      ...health,
      needsInitialIndexing: needsIndexing
    });
  } catch (error) {
    console.error('Vector search health check error:', error);
    res.status(500).json({ 
      error: 'Failed to check vector search health',
      message: error.message 
    });
  }
};

/**
 * Manually trigger data indexing for vector search
 */
const triggerDataIndexing = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required for manual indexing' 
      });
    }
    
    const { 
      type = 'all', 
      batchSize = 5, 
      skipExisting = true 
    } = req.body;
    
    // Validate parameters
    if (!['events', 'users', 'all'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be "events", "users", or "all"' 
      });
    }
    
    if (batchSize < 1 || batchSize > 100) {
      return res.status(400).json({ 
        error: 'Batch size must be between 1 and 100' 
      });
    }
    
    // Start indexing in background and return immediately
    res.status(202).json({ 
      message: 'Indexing started in background',
      type,
      batchSize,
      skipExisting
    });
    
    // Run indexing asynchronously
    indexData({ 
      type, 
      batchSize, 
      skipExisting,
      showProgress: true 
    }).then(results => {
      console.log('✅ Manual indexing completed:', results);
    }).catch(error => {
      console.error('❌ Manual indexing failed:', error.message);
    });
    
  } catch (error) {
    console.error('Trigger indexing error:', error);
    res.status(500).json({ 
      error: 'Failed to start indexing',
      message: error.message 
    });
  }
};

/**
 * Get indexing status
 */
const getIndexingStatus = async (req, res) => {
  try {
    const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
    const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');
    const Events = require('../database/schemas/eventsSchema');
    const Users = require('../database/schemas/usersSchema');
    
    const [totalEvents, totalUsers, indexedEvents, indexedUsers] = await Promise.all([
      Events.countDocuments(),
      Users.countDocuments(),
      EventEmbeddings.countDocuments(),
      UserEmbeddings.countDocuments()
    ]);
    
    res.status(200).json({
      events: {
        total: totalEvents,
        indexed: indexedEvents,
        remaining: totalEvents - indexedEvents,
        percentage: totalEvents > 0 ? Math.round((indexedEvents / totalEvents) * 100) : 0
      },
      users: {
        total: totalUsers,
        indexed: indexedUsers,
        remaining: totalUsers - indexedUsers,
        percentage: totalUsers > 0 ? Math.round((indexedUsers / totalUsers) * 100) : 0
      },
      needsIndexing: await needsInitialIndexing()
    });
  } catch (error) {
    console.error('Indexing status error:', error);
    res.status(500).json({ 
      error: 'Failed to get indexing status',
      message: error.message 
    });
  }
};

module.exports = {
  getVectorSearchHealth,
  triggerDataIndexing,
  getIndexingStatus
};