#!/usr/bin/env node

/**
 * MongoDB Atlas Vector Search Index Setup Script
 * 
 * This script creates Atlas Search indexes for vector search functionality
 * using the MongoDB Atlas Search API or Atlas CLI commands.
 * 
 * Prerequisites:
 * 1. MongoDB Atlas cluster with Atlas Search enabled
 * 2. Atlas CLI installed and authenticated (atlas auth login)
 * 3. OpenAI embeddings dimension: 1536
 */

require('dotenv').config();
const { connectToDatabase } = require('../database/connection');
const fs = require('fs');
const path = require('path');
const EventEmbeddings = require('../database/schemas/eventEmbeddingsSchema');
const UserEmbeddings = require('../database/schemas/userEmbeddingsSchema');

// Vector Search Index Configurations
const vectorSearchIndexes = {
  // Event Embeddings Vector Search Index
  eventEmbeddings: {
    name: 'event_vector_search',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'combined_embedding',
          numDimensions: 1536, // OpenAI embeddings dimension
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'title_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'description_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'category_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'location_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        // Filter fields for metadata filtering
        {
          type: 'filter',
          path: 'metadata.visibility'
        },
        {
          type: 'filter',
          path: 'metadata.event_type'
        },
        {
          type: 'filter',
          path: 'metadata.creator_id'
        },
        {
          type: 'filter',
          path: 'metadata.start_time'
        },
        {
          type: 'filter',
          path: 'metadata.end_time'
        }
      ]
    }
  },

  // User Embeddings Vector Search Index
  userEmbeddings: {
    name: 'user_vector_search',
    type: 'vectorSearch',
    definition: {
      fields: [
        {
          type: 'vector',
          path: 'profile_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'interests_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'event_preferences_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'social_pattern_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        {
          type: 'vector',
          path: 'location_preferences_embedding',
          numDimensions: 1536,
          similarity: 'cosine'
        },
        // Filter fields
        {
          type: 'filter',
          path: 'metadata.favorite_activities'
        },
        {
          type: 'filter',
          path: 'metadata.social_activity_level'
        },
        {
          type: 'filter',
          path: 'needs_embedding_update'
        }
      ]
    }
  },

  // AI Conversations Search Index (for conversation similarity)
  aiConversations: {
    name: 'conversation_search',
    type: 'search',
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          userId: {
            type: 'objectId'
          },
          title: {
            type: 'string',
            analyzer: 'lucene.standard'
          },
          'messages.content': {
            type: 'string',
            analyzer: 'lucene.standard'
          },
          'messages.role': {
            type: 'string'
          },
          'messages.timestamp': {
            type: 'date'
          },
          createdAt: {
            type: 'date'
          },
          updatedAt: {
            type: 'date'
          },
          isActive: {
            type: 'boolean'
          }
        }
      }
    }
  }
};

/**
 * Atlas CLI Commands to create indexes
 */
function generateAtlasCommands() {
  const projectId = process.env.ATLAS_PROJECT_ID;
  const clusterName = process.env.ATLAS_CLUSTER_NAME || 'Cluster0';
  
  if (!projectId) {
    console.error('ATLAS_PROJECT_ID environment variable is required');
    process.exit(1);
  }
}

/**
 * Create index definition files
 */
function createIndexFiles() {
  const indexDir = path.join(__dirname, 'atlas-indexes');
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }

  // Event Vector Index
  fs.writeFileSync(
    path.join(indexDir, 'event_vector_index.json'),
    JSON.stringify(vectorSearchIndexes.eventEmbeddings.definition, null, 2)
  );

  // User Vector Index
  fs.writeFileSync(
    path.join(indexDir, 'user_vector_index.json'),
    JSON.stringify(vectorSearchIndexes.userEmbeddings.definition, null, 2)
  );

  // Conversation Search Index
  fs.writeFileSync(
    path.join(indexDir, 'conversation_search_index.json'),
    JSON.stringify(vectorSearchIndexes.aiConversations.definition, null, 2)
  );
}

/**
 * Test vector search functionality
 * @param {boolean} skipConnection - Skip database connection if already connected
 */
async function testVectorSearch(skipConnection = false) {
  try {
    // Only connect if not already connected and not skipping
    if (!skipConnection) {
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        await connectToDatabase();
      }
    }

    // Check collections exist
    const eventCount = await EventEmbeddings.countDocuments();
    const userCount = await UserEmbeddings.countDocuments();

//     if (eventCount === 0) {
//       console.log('⚠️  No event embeddings found. You may need to run the indexing script first.');
//     }

//     if (userCount === 0) {
//       console.log('⚠️  No user embeddings found. You may need to run the indexing script first.');
//     }

//     // Test basic aggregation (will work once indexes are created)
//     console.log('\\n📝 Example Vector Search Query:');
//     console.log(`
// const pipeline = [
//   {
//     $vectorSearch: {
//       index: 'event_vector_search',
//       path: 'combined_embedding',
//       queryVector: [/* your query embedding array */],
//       numCandidates: 150,
//       limit: 10,
//       filter: {
//         'metadata.visibility': 'public',
//         'metadata.start_time': { $gte: new Date() }
//       }
//     }
//   },
//   {
//     $lookup: {
//       from: 'events',
//       localField: 'event',
//       foreignField: '_id',
//       as: 'event_details'
//     }
//   },
//   {
//     $project: {
//       event_details: 1,
//       searchable_content: 1,
//       score: { $meta: 'vectorSearchScore' }
//     }
//   }
// ];

// const results = await EventEmbeddings.aggregate(pipeline);
//     `);

//     console.log('✅ Vector search setup verification complete!');
    
  } catch (error) {
    console.error('❌ Vector search test failed:', error.message);
    throw error; // Re-throw for proper error handling when used as module
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

  switch (command) {
    case 'generate-commands':
      generateAtlasCommands();
      break;
    
    case 'create-files':
      createIndexFiles();
      break;
    
    case 'test':
      await testVectorSearch();
      break;
    
    default:
      console.log(`
🔍 MongoDB Atlas Vector Search Setup

Usage:
  node setupVectorSearch.js <command>

Commands:
  generate-commands  Generate Atlas CLI commands for creating indexes
  create-files      Create JSON files with index definitions
  test              Test vector search setup and show example queries

Environment Variables Required:
  ATLAS_PROJECT_ID   Your MongoDB Atlas Project ID
  ATLAS_CLUSTER_NAME Your cluster name (default: Cluster0)
  MONGODB_URI        Your MongoDB connection string

Example:
  node setupVectorSearch.js generate-commands
  node setupVectorSearch.js create-files
  node setupVectorSearch.js test
      `);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  vectorSearchIndexes,
  generateAtlasCommands,
  createIndexFiles,
  testVectorSearch,
};