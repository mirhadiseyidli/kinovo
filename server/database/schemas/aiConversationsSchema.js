const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  toolCalls: [{
    toolName: String,
    parameters: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed,
  }],
  // Rich data fields for UI components
  event: mongoose.Schema.Types.Mixed,
  events: [mongoose.Schema.Types.Mixed],
  weather: mongoose.Schema.Types.Mixed,
  traffic: mongoose.Schema.Types.Mixed,
  followUpSuggestions: [String],
  isStreaming: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const aiConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  title: {
    type: String,
    default: 'New Conversation',
    maxlength: 100,
  },
  messages: [messageSchema],
  messageCount: {
    type: Number,
    default: 0,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better query performance
aiConversationSchema.index({ userId: 1, lastMessageAt: -1 });
aiConversationSchema.index({ userId: 1, isActive: 1, lastMessageAt: -1 });

// Pre-save middleware to update timestamps and message count
aiConversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.messageCount = this.messages.length;
  
  if (this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
    
    // Auto-generate title from first user message if still default
    if (this.title === 'New Conversation') {
      const firstUserMessage = this.messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        // Take first 50 characters and add ellipsis if longer
        this.title = firstUserMessage.content.length > 50 
          ? firstUserMessage.content.substring(0, 50) + '...'
          : firstUserMessage.content;
      }
    }
  }
  
  next();
});

// Instance methods
aiConversationSchema.methods.addMessage = function(messageData) {
  this.messages.push({
    id: messageData.id || new mongoose.Types.ObjectId().toString(),
    role: messageData.role,
    content: messageData.content,
    timestamp: messageData.timestamp || new Date(),
    toolCalls: messageData.toolCalls || [],
    // Include rich data fields
    event: messageData.event,
    events: messageData.events,
    weather: messageData.weather,
    traffic: messageData.traffic,
    followUpSuggestions: messageData.followUpSuggestions,
    isStreaming: messageData.isStreaming || false,
  });
  return this;
};

aiConversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

// Static methods
aiConversationSchema.statics.findByUserId = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    includeInactive = false,
  } = options;
  
  const query = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .select('-messages'); // Exclude messages for list view
};

aiConversationSchema.statics.findByConversationId = function(conversationId, userId) {
  return this.findOne({ 
    conversationId, 
    userId, 
    isActive: true 
  });
};

aiConversationSchema.statics.createNewConversation = function(userId, initialMessage = null) {
  const conversationId = new mongoose.Types.ObjectId().toString();
  const conversation = new this({
    userId,
    conversationId,
    messages: initialMessage ? [initialMessage] : [],
  });
  
  return conversation;
};

module.exports = mongoose.model('AIConversation', aiConversationSchema);