# Kinovo AI System Architecture

## Overview

Our AI system uses **Vercel AI SDK** with **OpenAI's gpt-4o-mini** model, structured as a modular system within the existing Node.js server to minimize impact on the main app.

## Directory Structure

```
server/
├── vercelai/                    # AI system (modular, separate from main app)
│   ├── api/
│   │   ├── insights.js         # Edge Function for quick insights
│   │   └── agent.js            # Main chat agent endpoint
│   ├── config/
│   │   └── ai.config.js        # OpenAI models and settings
│   ├── lib/
│   │   ├── auth.js             # JWT verification for AI endpoints
│   │   └── api-client.js       # Internal API calls to server
│   ├── tools/                  # 9 AI tools (createEvent, weather, etc.)
│   └── rag/                    # RAG system with MongoDB Vector Search
├── routes/aiRoutes.js          # Express routes for AI endpoints
├── controllers/aiController.js # Controllers that bridge to vercelai/
└── server.js                   # Main server (mounts /api/ai routes)
```

## Complete Flow

### 1. Frontend → Server Routing

**Frontend Call:**
```typescript
// AiAssistant.v2.tsx
const response = await api.post('/api/ai/agent', {
  messages: [...previousMessages, { role: 'user', content: userInput }]
});
```

**Server Routing:**
```javascript
// server.js
app.use('/api/ai', aiRoutes);  // Mounts AI routes

// routes/aiRoutes.js  
router.post('/agent', authMiddleware, chatWithAgent);  // Auth + controller

// controllers/aiController.js
const chatWithAgent = async (req, res) => {
  await runAIHandler('agent.js', req, res, false);  // Calls vercelai/api/agent.js
};
```

### 2. Authentication Flow

```javascript
// controllers/aiController.js - runAIHandler function
const edgeRequest = {
  headers: {
    authorization: req.headers.authorization,  // JWT token passed through
    // ... other headers
  },
  json: async () => req.body,  // Messages array
};

// vercelai/api/agent.js
const token = extractTokenFromHeaders(req.headers);
const user = await verifyUserToken(token);  // Decode JWT → {userId, email}
```

### 3. AI Processing Pipeline

**Step 1: RAG Context Generation**
```javascript
// vercelai/api/agent.js
const ragContext = await generateRAGContext(user.userId, userQuery, conversationHistory);
// → Searches MongoDB with vector embeddings for relevant user events/data
```

**Step 2: Enhanced System Prompt**
```javascript
const enhancedSystemPrompt = buildEnhancedSystemPrompt(SYSTEM_PROMPT, ragContext);
// → Combines base prompt + personalized context from user's events
```

**Step 3: AI Generation with Tools**
```javascript
const result = await generateText({
  model: chatModel,               // gpt-4o-mini
  system: enhancedSystemPrompt,   // Personalized prompt
  messages,                       // Conversation history
  tools,                          // 9 AI tools available
  toolChoice: 'auto',            // Let AI decide when to use tools
});
```

### 4. AI Tools System

When the AI needs to take actions, it can call any of these 9 tools:

```javascript
// vercelai/tools/index.js
export const tools = {
  createEvent,     // Create new events
  updateEvent,     // Modify existing events  
  cancelEvent,     // Cancel events
  inviteUser,      // Invite friends to events
  removeUser,      // Remove attendees
  searchEvents,    // Find events by criteria
  weather,         // Get weather data for events
  traffic,         // Get directions/traffic info
  knowledgeBase,   // Query user's event history via RAG
};
```

**Tool Execution Flow:**
```javascript
// Each tool uses APIClient to make internal server calls
// vercelai/tools/createEvent.js
const client = new APIClient(token);
const result = await client.createEvent(eventData);
// → Makes authenticated POST to /api/manageevents/eventslist/create/new/event
```

### 5. Response Flow Back to Frontend

**Backend Response:**
```javascript
// vercelai/api/agent.js
return new Response(JSON.stringify({ 
  content: result.text,           // AI's complete response
  usage: result.usage,           // Token usage stats
  finishReason: result.finishReason,
}));
```

**Frontend Processing:**
```typescript
// AiAssistant.v2.tsx
const assistantContent = response.data.content || response.data.message;

// Simulate streaming on frontend
const streamInterval = setInterval(() => {
  const partialContent = assistantContent.slice(0, currentIndex + 1);
  setMessages(prev => /* update message with partial content */);
  currentIndex++;
}, 30); // 30ms = ~33 chars/second typing effect
```

## Key Design Decisions

1. **Modular Architecture**: AI system in `/vercelai` folder keeps it separate from main app
2. **Complete Responses**: Backend returns full response, frontend simulates streaming for UX
3. **JWT Authentication**: Same auth system as main app, tokens passed through all layers
4. **MongoDB RAG**: Uses existing MongoDB with vector search instead of external vector DB
5. **Internal API Calls**: AI tools call existing server endpoints with APIClient
6. **Cost Optimization**: Uses gpt-4o-mini model for cost efficiency

## RAG System Flow

```javascript
// User asks: "What events do I have this weekend?"
// 1. Generate embedding for query
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: userQuery
});

// 2. Vector search in MongoDB
const relevantEvents = await eventsCollection.aggregate([
  {
    $vectorSearch: {
      index: "event_vector_index",
      path: "embedding",
      queryVector: embedding.data[0].embedding,
      numCandidates: 100,
      limit: 10
    }
  }
]);

// 3. Build context for AI
const context = {
  relevant_events: relevantEvents,
  user_preferences: userProfile,
  recent_activity: recentInteractions
};
```

## API Endpoints

### `/api/ai/insights` (GET)
- **Purpose**: Quick personalized insights for app launch
- **Runtime**: Edge Function for fast response
- **Caching**: 5-minute per-user cache
- **Response**: Single insight card with title, subtitle, emoji, CTA

### `/api/ai/agent` (POST)
- **Purpose**: Main chat interface with tool calling
- **Runtime**: Node.js (Vercel Fluid Compute)
- **Features**: RAG context, conversation history, 9 AI tools
- **Response**: Complete AI response with usage stats

## Tools Available to AI

1. **createEvent**: Create new events with full validation
2. **updateEvent**: Modify existing events the user owns
3. **cancelEvent**: Cancel events and notify attendees
4. **inviteUser**: Add friends to events with notifications
5. **removeUser**: Remove attendees from events
6. **searchEvents**: Find events by location, time, category, etc.
7. **weather**: Get weather forecasts for event planning
8. **traffic**: Get directions and traffic information
9. **knowledgeBase**: Query user's event history and preferences via RAG

## Performance Characteristics

- **Model**: gpt-4o-mini (cost-effective, fast)
- **Response Time**: ~2-3 seconds for complex queries with tools
- **Caching**: Insights cached for 5 minutes per user
- **Streaming**: Simulated on frontend for better UX
- **Context Window**: Managed to stay within token limits
- **Error Handling**: Graceful fallbacks at each layer

## Security Features

- **JWT Authentication**: All endpoints require valid tokens
- **User Isolation**: RAG searches scoped to user's data only
- **API Access Control**: Tools can only access user's authorized data
- **Input Validation**: Zod schemas validate all tool parameters
- **Rate Limiting**: Built into Vercel platform

This creates a comprehensive AI assistant that can understand user context, take actions via tools, and provide personalized responses while maintaining the existing app's architecture and authentication.