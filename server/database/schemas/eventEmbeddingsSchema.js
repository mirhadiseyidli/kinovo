const mongoose = require('mongoose');

const eventEmbeddingsSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Events',
    required: true,
    unique: true,
  },
  
  // Content embeddings for semantic search
  title_embedding: {
    type: [Number], // Array of floats for OpenAI embeddings (1536 dimensions)
    required: true,
  },
  
  description_embedding: {
    type: [Number],
    default: [],
  },
  
  category_embedding: {
    type: [Number],
    required: true,
  },
  
  // Combined content embedding for general search
  combined_embedding: {
    type: [Number],
    required: true,
  },
  
  // Location embedding (for location-based similarity)
  location_embedding: {
    type: [Number],
    default: [],
  },
  
  // Metadata for filtering and context
  metadata: {
    event_type: String,
    visibility: {
      type: String,
      enum: ['public', 'private', 'selected'],
    },
    start_time: Date,
    end_time: Date,
    location: {
      text: String,
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    attendee_count: {
      type: Number,
      default: 0,
    },
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
  },
  
  // For text reconstruction in RAG
  searchable_content: {
    title: String,
    description: String,
    category: String,
    location_text: String,
  },
  
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
});

// Indexes for vector search
eventEmbeddingsSchema.index({ event: 1 });
eventEmbeddingsSchema.index({ 'metadata.creator_id': 1 });
eventEmbeddingsSchema.index({ 'metadata.start_time': 1 });
eventEmbeddingsSchema.index({ 'metadata.visibility': 1 });

// Compound index for filtering
eventEmbeddingsSchema.index({ 
  'metadata.visibility': 1, 
  'metadata.start_time': 1 
});

// Pre-save middleware to update timestamp
eventEmbeddingsSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('EventEmbeddings', eventEmbeddingsSchema);