const mongoose = require('mongoose');

const userEmbeddingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
    unique: true,
  },
  
  // Profile-based embeddings
  interests_embedding: {
    type: [Number], // OpenAI embeddings (1536 dimensions)
    default: [],
  },
  
  bio_embedding: {
    type: [Number],
    default: [],
  },
  
  // Behavioral embeddings based on event history
  event_preferences_embedding: {
    type: [Number],
    default: [],
  },
  
  // Social behavior embeddings
  social_pattern_embedding: {
    type: [Number],
    default: [],
  },
  
  // Combined user profile embedding
  profile_embedding: {
    type: [Number],
    required: true,
  },
  
  // Location preferences
  location_preferences_embedding: {
    type: [Number],
    default: [],
  },
  
  // Metadata for context
  metadata: {
    favorite_activities: [String],
    preferred_locations: [String],
    event_attendance_rate: {
      type: Number,
      default: 0,
    },
    social_activity_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    last_activity: Date,
  },
  
  // Event history summary for RAG context
  event_summary: {
    total_events_created: {
      type: Number,
      default: 0,
    },
    total_events_attended: {
      type: Number,
      default: 0,
    },
    most_common_categories: [String],
    typical_event_time: String, // 'morning', 'afternoon', 'evening', 'weekend'
    preferred_event_duration: String, // 'short', 'medium', 'long'
  },
  
  // For text reconstruction in RAG
  searchable_content: {
    interests_text: String,
    bio_text: String,
    activity_summary: String,
    social_summary: String,
  },
  
  // Recent interactions for personalization
  recent_searches: [{
    query: String,
    timestamp: Date,
    results_clicked: [mongoose.Schema.Types.ObjectId],
  }],
  
  // AI assistant conversation history (last 30 days)
  conversation_topics: [{
    topic: String,
    frequency: Number,
    last_mentioned: Date,
  }],
  
  // Indexing and updates
  created_at: {
    type: Date,
    default: Date.now,
  },
  
  updated_at: {
    type: Date,
    default: Date.now,
  },
  
  // Versioning for embedding updates
  embedding_version: {
    type: String,
    default: '1.0',
  },
  
  // Auto-update schedule
  last_profile_sync: {
    type: Date,
    default: Date.now,
  },
  
  needs_embedding_update: {
    type: Boolean,
    default: false,
  },
});

// Indexes
userEmbeddingsSchema.index({ user: 1 });
userEmbeddingsSchema.index({ 'metadata.favorite_activities': 1 });
userEmbeddingsSchema.index({ needs_embedding_update: 1 });
userEmbeddingsSchema.index({ last_profile_sync: 1 });

// Pre-save middleware
userEmbeddingsSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('UserEmbeddings', userEmbeddingsSchema);