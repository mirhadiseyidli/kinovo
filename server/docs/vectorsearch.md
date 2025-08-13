# Vector Search Integration Documentation

## Overview

This document describes the integrated vector search system for Kinovo, which enables semantic search capabilities for the AI assistant. The system automatically generates and maintains embeddings for events and users, enabling intelligent content discovery and recommendations.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│                   MongoDB Atlas                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │Vector Indexes│  │  Embeddings  │  │   Data   │  │
│  │              │  │  Collections │  │Collections│  │
│  └──────────────┘  └──────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘
                            ↑
                            │
┌─────────────────────────────────────────────────────┐
│                   Server Layer                       │
│  ┌──────────────────────────────────────────────┐  │
│  │     Vector Search Initializer Service        │  │
│  │  - Initialization on startup                 │  │
│  │  - Connection reuse                          │  │
│  │  - Health monitoring                         │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │   Database   │  │     Cron     │  │   API   │  │
│  │    Hooks     │  │     Jobs     │  │ Routes  │  │
│  └──────────────┘  └──────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────┘
                            ↑
                            │
┌─────────────────────────────────────────────────────┐
│                    AI Services                       │
│  ┌──────────────────────────────────────────────┐  │
│  │           Vector Search Service              │  │
│  │  - searchSimilarEvents()                     │  │
│  │  - searchSimilarUsers()                      │  │
│  │  - RAG context building                      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Key Files and Their Purposes

### Core Services

1. **`services/vectorSearchInitializer.js`**
   - Initializes vector search on server startup
   - Reuses existing database connection (no redundant connections)
   - Provides health check and indexing functions
   - Manages both automatic and manual indexing

2. **`services/vectorSearchService.js`**
   - Generates embeddings using OpenAI
   - Provides search functions for AI integration
   - Handles fallback for non-Atlas environments

### Modified Scripts (Work Both Standalone and Integrated)

1. **`scripts/setupVectorSearch.js`**
   - Creates Atlas index definitions
   - Tests vector search setup
   - Parameters: `skipConnection` to avoid reconnecting when called from server

2. **`scripts/indexDataForVectorSearch.js`**
   - Indexes events and users in batches
   - Handles rate limiting for API calls
   - Parameters: `skipConnection` for server integration

3. **`scripts/generateInitialEmbeddings.js`**
   - Alternative indexing script
   - Simpler approach for initial setup
   - Auto-detects if running standalone or as module

### Automatic Embedding Generation

1. **`database/hooks/embeddingHooks.js`**
   - Database hooks for automatic embedding generation
   - Triggers on document creation and updates
   - Non-blocking background processing

2. **`middleware/embeddingMiddleware.js`**
   - Alternative middleware approach for embedding generation
   - Can be used in controllers for more control

3. **`cron/embeddingUpdateCron.js`**
   - Batch processes pending embedding updates
   - Runs every 30 minutes by default
   - Handles orphaned embeddings cleanup

### API Endpoints

1. **`controllers/vectorSearchController.js`**
   - Health check endpoint
   - Manual indexing trigger (admin only)
   - Indexing status monitoring

2. **`routes/vectorSearchRoutes.js`**
   - GET `/api/vector-search/health` - Public health check
   - GET `/api/vector-search/status` - Indexing progress (auth required)
   - POST `/api/vector-search/index` - Manual indexing (admin only)

### AI Integration

1. **`vercelai/rag/vector-search.js`**
   - Vector search implementation for RAG
   - Uses Atlas Vector Search indexes
   - Provides context for AI responses

## Setup Process (One-Time)

### 1. Create Atlas Vector Search Indexes

```bash
# Generate index definition files
node scripts/setupVectorSearch.js create-files

# Files created in scripts/atlas-indexes/:
# - event_vector_index.json
# - user_vector_index.json
# - conversation_search_index.json
```

Then create indexes in MongoDB Atlas:
- Go to MongoDB Atlas Console
- Navigate to your cluster → Atlas Search
- Create indexes using the generated JSON files

Index names must match:
- Events: `event_vector_search`
- Users: `user_vector_search`

### 2. Index Existing Data

Option A: Automatic on server start
```bash
AUTO_INDEX_EMBEDDINGS=true npm start
```

Option B: Manual via API
```bash
curl -X POST http://localhost:5002/api/vector-search/index \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "all", "batchSize": 10}'
```

Option C: Standalone script
```bash
node scripts/indexDataForVectorSearch.js all
```

## How It Works

### Server Startup Flow

```javascript
1. Server starts
   ↓
2. connectToDatabase() // Single connection
   ↓
3. initializeVectorSearch()
   - Checks Atlas environment
   - Verifies indexes exist
   - Optionally triggers initial indexing
   ↓
4. startEmbeddingUpdateCron()
   - Schedules batch updates every 30 minutes
```

### Automatic Embedding Generation

When an event is created:
```javascript
1. Event created via API
   ↓
2. Database hook triggered (post-save)
   ↓
3. generateEventEmbeddingAsync() called
   ↓
4. Embedding generated in background
   ↓
5. Stored in EventEmbeddings collection
```

When an event is updated:
```javascript
1. Event updated via API
   ↓
2. Database hook triggered (post-update)
   ↓
3. Marked with needs_embedding_update: true
   ↓
4. Cron job processes update (within 30 min)
   ↓
5. New embedding generated and stored
```

### AI Query Flow

```javascript
1. User asks AI a question
   ↓
2. AI generates query embedding
   ↓
3. Vector search finds similar content
   ↓
4. Results used as context for AI response
   ↓
5. AI generates contextual answer
```

## Environment Variables

```bash
# MongoDB Atlas (required for vector search)
MONGODB_URI=mongodb+srv://...

# OpenAI API (for generating embeddings)
OPENAI_API_KEY=sk-...

# Optional configurations
AUTO_INDEX_EMBEDDINGS=true              # Auto-index on server start
DISABLE_AUTO_EMBEDDINGS=false          # Disable automatic generation
DISABLE_EMBEDDING_CRON=false           # Disable update cron job
EMBEDDING_UPDATE_SCHEDULE=*/30 * * * *  # Cron schedule (default: 30 min)

# Atlas CLI configuration (for manual index creation)
ATLAS_PROJECT_ID=...
ATLAS_CLUSTER_NAME=Cluster0
```

## Database Collections

### EventEmbeddings Collection
```javascript
{
  event: ObjectId,              // Reference to event
  title_embedding: [1536],      // Title vector
  description_embedding: [1536], // Description vector
  category_embedding: [1536],    // Category vector
  location_embedding: [1536],    // Location vector
  combined_embedding: [1536],    // Combined vector for search
  metadata: {
    event_type: String,
    visibility: String,
    start_time: Date,
    end_time: Date,
    location: Object,
    attendee_count: Number,
    creator_id: ObjectId
  },
  searchable_content: Object,
  embedding_version: String,
  needs_embedding_update: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### UserEmbeddings Collection
```javascript
{
  user: ObjectId,                // Reference to user
  profile_embedding: [1536],     // Profile vector
  interests_embedding: [1536],   // Interests vector
  bio_embedding: [1536],         // Bio vector
  event_preferences_embedding: [1536],
  social_pattern_embedding: [1536],
  location_preferences_embedding: [1536],
  metadata: {
    favorite_activities: [String],
    social_activity_level: String,
    location: Object,
    last_activity: Date
  },
  searchable_content: Object,
  event_summary: Object,
  embedding_version: String,
  needs_embedding_update: Boolean,
  created_at: Date,
  updated_at: Date
}
```

## Maintenance

### Health Monitoring

Check system health:
```bash
curl http://localhost:5002/api/vector-search/health
```

Response:
```json
{
  "healthy": true,
  "stats": {
    "eventEmbeddings": 150,
    "userEmbeddings": 50,
    "indexesConfigured": ["eventEmbeddings", "userEmbeddings"]
  },
  "needsInitialIndexing": false
}
```

### Manual Reindexing

If needed (e.g., after model changes):
```bash
# Reindex all data
curl -X POST http://localhost:5002/api/vector-search/index \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"type": "all", "skipExisting": false}'
```

### Troubleshooting

1. **Embeddings not generating:**
   - Check `OPENAI_API_KEY` is set
   - Verify `DISABLE_AUTO_EMBEDDINGS` is not true
   - Check API rate limits

2. **Vector search not working:**
   - Verify Atlas indexes are created
   - Check index names match configuration
   - Ensure MongoDB URI is Atlas (not local)

3. **High API costs:**
   - Adjust `EMBEDDING_UPDATE_SCHEDULE` for less frequent updates
   - Increase batch sizes in indexing
   - Use `skipExisting: true` for incremental updates

## Best Practices

1. **Initial Setup:**
   - Run indexing during low-traffic periods
   - Use appropriate batch sizes (5-10 for production)
   - Monitor API rate limits

2. **Ongoing Operations:**
   - Let automatic hooks handle new data
   - Use cron for batch updates (more efficient)
   - Monitor health endpoints regularly

3. **Cost Optimization:**
   - Cache embeddings (already implemented)
   - Skip unchanged content on updates
   - Use smaller embedding models if appropriate

## Integration Benefits

1. **No Redundant Connections:** Server connects once, all services share the connection
2. **Automatic Maintenance:** Embeddings stay up-to-date without manual intervention
3. **Flexible Control:** Environment variables for fine-tuning behavior
4. **Production Ready:** Background processing, error handling, and monitoring
5. **Backward Compatible:** Scripts still work standalone for debugging

## Summary

The vector search system is now fully integrated and automated:
- **Setup:** One-time index creation and initial data indexing
- **Runtime:** Automatic embedding generation and updates
- **Maintenance:** Self-healing with cron jobs and health monitoring
- **AI Integration:** Seamless context retrieval for intelligent responses

The system requires no manual intervention after initial setup and automatically maintains embeddings as data changes.