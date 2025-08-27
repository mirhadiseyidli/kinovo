// AI Controller for Vercel AI SDK endpoints
const path = require('path');
const mongoose = require('mongoose');
const AIConversation = require('../database/schemas/aiConversationsSchema');
const { streamText, tool, Output, smoothStream, streamObject } = require('ai');
const { z } = require('zod');
const { chatModel, AGENT_CONFIG } = require('../vercelai/config/ai.config.js');
const { verifyUserToken } = require('../vercelai/lib/auth.js');
const { tools: baseTools } = require('../vercelai/tools/index.js');
const { generateRAGContext, buildEnhancedSystemPrompt, limitContextTokens } = require('../vercelai/rag/context-manager.js');
const User = require('../database/schemas/usersSchema.js');
const { 
  eventDataSchema, 
  weatherDataSchema, 
  trafficDataSchema, 
  agentResponseSchema 
} = require('../vercelai/tools/schemas.js');

/**
 * Helper function to run AI handlers from the vercelai directory
 * Converts Express request/response to compatible format for Vercel AI handlers
 */
const runAIHandler = async (handlerPath, req, res, isStreaming = false) => {
  try {
    // Resolve the handler path relative to the server directory
    const fullPath = path.resolve(__dirname, '../vercelai/api', handlerPath);
    
    // Dynamically import the ES module
    const { default: handler } = await import(fullPath);

    // Convert Express request to compatible format
    const edgeRequest = {
      headers: {
        get: (name) => req.headers[name.toLowerCase()],
        authorization: req.headers.authorization,
        forEach: (callback) => {
          Object.entries(req.headers).forEach(([key, value]) => {
            callback(value, key);
          });
        },
      },
      json: async () => req.body,
      method: req.method,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`, // Include full URL with query params
      signal: req.abortSignal || req.signal, // Forward abort signal for streaming cancellation
    };

    // Call the handler
    const response = await handler(edgeRequest);
    
    if (isStreaming && response.body) {
      // For useObject compatibility, forward the exact response from toTextStreamResponse()
      // Copy all headers from the AI handler response
      response.headers.forEach((value, key) => {
        // Don't override content-length as we're streaming
        if (key.toLowerCase() !== 'content-length') {
          res.setHeader(key, value);
        }
      });
      
      // Stream the response body directly
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let totalChunks = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          totalChunks++;
          res.write(chunk);
        }
      } finally {
        res.end();
      }
    } else {
      // Handle regular JSON response
      const data = await response.json();
      
      // Copy headers from the handler response
      if (response.headers) {
        response.headers.forEach((value, key) => {
          if (key !== 'content-length') {
            res.setHeader(key, value);
          }
        });
      }
      
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('AI handler error:', error);
    res.status(500).json({ 
      error: 'AI service error',
      message: error.message,
    });
  }
};

/**
 * Get AI response without handling the HTTP response
 * Used for conversation saving workflow
 */
const getAIResponse = async (handlerPath, req) => {
  // Resolve the handler path relative to the server directory
  const fullPath = path.resolve(__dirname, '../vercelai/api', handlerPath);
  
  // Dynamically import the ES module
  const { default: handler } = await import(fullPath);

  // Convert Express request to compatible format
  const edgeRequest = {
    headers: {
      get: (name) => req.headers[name.toLowerCase()],
      authorization: req.headers.authorization,
      forEach: (callback) => {
        Object.entries(req.headers).forEach(([key, value]) => {
          callback(value, key);
        });
      },
    },
    json: async () => req.body,
    method: req.method,
    user: req.user, // Pass the authenticated user data
  };

  // Call the handler
  const response = await handler(edgeRequest);
  const data = await response.json();
  
  // Parse the content to extract rich data if available
  try {
    const parsedContent = JSON.parse(data.content);
    if (parsedContent && typeof parsedContent === 'object') {
      // Extract rich data fields and merge them into the response
      return {
        ...data,
        content: parsedContent.message || data.content,
        events: parsedContent.events,
        weather: parsedContent.weather,
        traffic: parsedContent.traffic,
        followUpSuggestions: parsedContent.followUpSuggestions,
      };
    }
  } catch (error) {
    // Content is not JSON, return as-is
    console.log('Content is not JSON, returning as plain text');
  }
  
  return data;
};

/**
 * Save conversation to MongoDB
 */
const saveConversationToMongoDB = async (userId, aiResponse) => {
  try {
    const { conversationId, content, userMessage, events, weather, traffic, followUpSuggestions } = aiResponse;
    
    const assistantMessage = {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'assistant',
      content: content,
      timestamp: new Date(),
      toolCalls: [], // TODO: Extract tool calls from result if available
      // Include rich data fields
      events: events,
      weather: weather,
      traffic: traffic,
      followUpSuggestions: followUpSuggestions,
    };

    let conversation;
    if (conversationId) {
      // Add to existing conversation
      conversation = await AIConversation.findByConversationId(conversationId, userId);
      if (conversation) {
        // Add user message if it's not already saved (check by id or content)
        const existingUserMessage = conversation.messages.find(msg => 
          msg.id === userMessage.id || 
          (msg.role === 'user' && msg.content === userMessage.content && 
           Math.abs(new Date(msg.timestamp) - new Date(userMessage.timestamp)) < 10000)
        );
        
        if (!existingUserMessage) {
          conversation.addMessage(userMessage);
        }
        conversation.addMessage(assistantMessage);
        await conversation.save();
      } else {
        // Create new conversation with the provided ID
        conversation = new AIConversation({
          userId,
          conversationId,
          messages: [],
        });
        conversation.addMessage(userMessage);
        conversation.addMessage(assistantMessage);
        await conversation.save();
      }
    } else {
      // Create new conversation
      conversation = AIConversation.createNewConversation(userId);
      conversation.addMessage(userMessage);
      conversation.addMessage(assistantMessage);
      await conversation.save();
      
      // Update the response with the new conversation ID
      aiResponse.conversationId = conversation.conversationId;
    }

    return conversation;
  } catch (saveError) {
    console.error('Failed to save conversation:', saveError);
    throw saveError;
  }
};

/**
 * Get AI insights for app launch
 * Provides personalized insights based on user data
 */
const getAIInsights = async (req, res) => {
  await runAIHandler('insights.js', req, res);
};

/**
 * Get AI insights with streaming for real-time typing effect
 * Streams the insight generation process chunk by chunk
 */
const getAIInsightsStream = async (req, res) => {
  await runAIHandler('insights-stream.js', req, res, true);
};

/**
 * Chat with AI agent
 * Handles long-running conversations with tool calling
 */
const chatWithAgent = async (req, res) => {
  try {
    // Get the AI response first
    const aiResponse = await getAIResponse('agent.js', req);
    
    // Save conversation if requested
    if (aiResponse.saveConversation) {
      await saveConversationToMongoDB(req.user._id, aiResponse);
    }
    
    // Remove internal fields before sending to client
    const { saveConversation, userMessage, ...clientResponse } = aiResponse;
    res.json(clientResponse);
    
  } catch (error) {
    console.error('Chat with agent error:', error);
    res.status(500).json({
      error: 'AI service error',
      message: error.message,
    });
  }
};

// export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are Kinovo AI, a helpful assistant for outdoor activities event planning and social coordination.

Your capabilities:
- Create, update, and manage events
- Search for events based on user preferences
- Join events as an attendee
- Invite and manage event attendees
- Check weather conditions for event planning
- Get traffic/direction information
- Provide personalized event suggestions
- Check user's relationship to events (attendance, creator status)

Guidelines:
- Be friendly, concise, and helpful
- Always confirm important actions before executing
- Suggest relevant follow-up actions
- Use emojis sparingly for a friendly tone
- If unsure about event details, ask for clarification
- Respect user privacy and only access authorized data
- When discussing events, always check user relationship (attending, created, invited)
- Use checkEventStatus tool to get detailed event information including user status
- For queries about "my events", "upcoming events", "past events" use getUserEvents tool
- Use searchEvents tool for finding new events, not for user's own events
- When user asks for "nearby events", "recommendations", "suggestions", or "events near me", searchEvents will automatically use smart ranking based on their preferences, friends, location, and past event behavior
- The searchEvents tool intelligently detects recommendation queries and applies personalized ranking
- When searching locations, the user's coordinates will be used for location bias automatically
- IMPORTANT: Never add start_time or end_time parameters to searchEvents unless the user explicitly specifies dates - by default, the search will find upcoming events from now to the future
- Only include date parameters when user says things like "events this weekend", "events next week", "events on Friday", etc.
- When calling tools, omit optional parameters entirely if they're not needed - do not pass null values
- IMPORTANT: Always use MongoDB ObjectIds for event operations, never use event titles
- If user refers to "that event" or mentions an event by name, first use getUserEvents to find the correct event ID
- For destructive actions (cancel, delete, update), always confirm the specific event details before proceeding
- Use joinEvent when user wants to attend/join an event themselves
- Use inviteUser when user wants to invite someone else to an event
- Do not respond with anything that sounds like a guideline for you

When creating events:
- IMPORTANT: Always use searchLocation tool when user provides a location for an event
- After searching, show the user the top results and ask them to confirm which one
- Use the confirmed location's coordinates and formatted address in the event
- Ensure all required fields are provided (title, start_time, end_time, category)
- Suggest appropriate categories based on the event description
- Default to 'private' visibility unless specified
- Validate date/time formats

Location handling workflow:
1. When user mentions a location (e.g., "at Central Park" or "Starbucks on 5th Avenue")
2. Use searchLocation tool to find matching places
3. Present the top results to the user with names and addresses
4. Wait for user confirmation (e.g., "Is this the Central Park in New York you meant?")
5. Use the confirmed location's details when creating the event

When handling event references:
- If user says "that event", "the event", or mentions an event by name, use getUserEvents to find it
- Always confirm which specific event before taking destructive actions
- Show event title, date, and ID when confirming actions
- Never assume event IDs - always look them up using titles or descriptions
- Review recent conversation history to identify events previously discussed

Example workflow for "cancel that event":
1. Use getUserEvents to find user's events
2. Match the referenced event by title or context
3. Confirm the specific event with user
4. Use the correct ObjectId for the cancel operation

Finding events by name:
- Use findEventByTitle to search within user's own events
- Use searchEvents with the query parameter to find public/visible events by title
- If user mentions "join that event" from earlier in conversation, look back at recent messages to find the event ID

Event Data Structure:
Events will be provided with complete information including:
- Include the full event data in your response
- Event data should match the eventDataSchema

Response Format:
- Put the main text in 'message'
- Add event details in 'events' when applicable
- Add 'weather' and/or 'traffic' when relevant
- Add 'actionTaken' if any action was performed
- Add 'followUpSuggestions' for next steps
- Add 'conversationId' field with the current conversation ID if available
- IMPORTANT: Omit fields entirely when they don't have data - do not set them to null or empty strings

When using tools that return weather or traffic data:
- Provide a SIMPLE, conversational response in 'message' (e.g., "Here's the current weather and traffic")
- DO NOT include detailed weather/traffic data or ask unnecessary questions in the message text
- Put all detailed data in the structured 'weather' and 'traffic' objects
- Weather temperature always should be in Fahrenheit units

CRITICAL: Keep message text conversational and brief. Let the cards show the detailed data.

When presenting lists in 'message', use plain text bullets (- or •), one item per line, with a blank line before and after the list. Avoid markdown tables.

Remember: You're helping users plan and manage their social life effectively.
IMPORTANT NOTE: DO NOT MENTION ANY OTHER APPs. IF ANYTHING, YOUR SUGGESTIONS SHOULD BE KINOVO BASED
`;


const chatWithAgentStream = async (req, res) => {
  try {
    const abortController = new AbortController();

    const user = await User.findById(req.user._id)
    // ── Auth ───────────────────────────────────────────────────────────────────
    const token = req.get('authorization')?.split(' ')[1];
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // const user = await verifyUserToken(token);
    const userContext = { userId: user.userId, email: user.email };

    const { messages, conversationId: clientConversationId, saveConversation = true, timezone, userLocation } = req.body || {};
    
    // Generate a new conversation ID if one doesn't exist
    const conversationId = clientConversationId || new mongoose.Types.ObjectId().toString();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract user query from the latest message
    const userQuery = messages[messages.length - 1]?.content || '';
    const conversationHistory = messages.slice(-10).map(m => m.content); // Last 10 messages

    // ── RAG prompt enrichment (safe fallback) ──────────────────────────────────
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    try {
      const ragContext = await generateRAGContext(userContext.userId, userQuery, conversationHistory);
      const limited = limitContextTokens(ragContext, 2000);
      enhancedSystemPrompt = buildEnhancedSystemPrompt(SYSTEM_PROMPT, limited);
    } catch {
      // keep base prompt
    }

    const contextualSystemPrompt = `${enhancedSystemPrompt}

Current user: ${userContext.email} (ID: ${userContext.userId})
User timezone: ${timezone || 'UTC'}
Current time (user's timezone): ${
      timezone ? new Date().toLocaleString('en-US', { timeZone: timezone }) : new Date().toISOString()
    }
${userLocation ? `User location: ${userLocation.text || `${userLocation.city}, ${userLocation.state}`} (${userLocation.lat}, ${userLocation.lng})` : 'User location: Not available'}
Conversation ID: ${conversationId || 'N/A'}

IMPORTANT: Always include the conversationId "${conversationId || ''}" in your response when it's available.`;

    // ── Wrap tools with ai.tool(...) so the model can call them ────────────────
    const ctx = {
      headers: { authorization: `Bearer ${token}` },
      user: userContext,
      timezone: timezone || 'UTC',
      userLocation: userLocation || null,
      conversationId,
    };

    const wrappedTools = Object.fromEntries(
      Object.entries(baseTools).map(([name, t]) => [
        name,
        tool({
          description: t.description,
          parameters: t.parameters,                  // Zod schema
          async execute(params, { toolCallId, messages: llmMsgs, abortSignal }) {
            return t.execute(params, {
              ...ctx,
              toolCallId,
              llmMessages: llmMsgs,
              abortSignal,
            });
          },
        }),
      ])
    );

    // ── Stream text (token by token) + structured object + tool deltas ────────
    const partialObjectStream = streamText({
      model: chatModel,
      system: contextualSystemPrompt,
      // output: 'array',
      schema: agentResponseSchema,
      messages, // expects [{role:'user'|'assistant'|'system'|'tool', content:...}, ...]
      tools: wrappedTools,
      toolChoice: 'auto',
      toolCallStreaming: true,                      // stream tool call args/results
      maxSteps: AGENT_CONFIG.maxSteps,
      temperature: AGENT_CONFIG.temperature,
      maxTokens: AGENT_CONFIG.maxTokens,
      mode: 'json',
      // Ask the SDK to also parse a typed object while we stream text
      experimental_output: Output.object({ schema: agentResponseSchema }),
      abortSignal: abortController.signal,
      // Make token flow smooth & fast (word-chunked with minimal delays)
      experimental_transform: smoothStream({ delayInMs: 50, chunking: 'word' }),
      onError(error) {
        console.error('stream error:', error);
      },
      // onChunk(chunk) {
      //   console.log('📝 Stream started - first token should appear soon', chunk);
      // },
      // onAbort(shit) {
      //   console.log('🔤 Token:', shit);
      //   console.log('--------------------------------------')
      // },
      onFinish(result) {
        // Save conversation if requested
        try {
          const parsedResult = JSON.parse(result.text);
          
          if (saveConversation) {
            // Construct the proper AI response object for saving
            const aiResponse = {
              conversationId: conversationId,
              content: parsedResult.message,
              userMessage: messages[messages.length - 1], // Last user message
              // Include rich data fields
              events: parsedResult.events,
              weather: parsedResult.weather,
              traffic: parsedResult.traffic,
              followUpSuggestions: parsedResult.followUpSuggestions,
            };
            saveConversationToMongoDB(req.user._id, aiResponse).catch((error) => {
              console.error('Failed to save conversation:', error);
            });
          }
        } catch (error) {
          console.error('Failed to parse result.text:', error);
        }
      }
    });

    // Set SSE headers to prevent buffering and ensure real-time streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
    
    // Use the AI SDK's built-in method to pipe the stream to Express response
    // Stream the response, but check for abort signal
    try {
      for await (const textPart of partialObjectStream.textStream) {
        // Check if the abort signal has been triggered
        if (abortController.signal.aborted) {
          break;
        }
        
        // Check if the response is still writable
        if (res.writableEnded || res.destroyed) {
          break;
        }
        
        // console.log(textPart);
        res.write(textPart);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('✅ Stream aborted successfully');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Agent streaming error:', error);
    console.error('📍 Error stack:', error.stack);
    
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        error: 'An error occurred processing your request',
        details: String(error?.message || error),
      });
    } else {
      // If streaming has started, end the response
      res.end();
    }
  } finally {
    res.end();
  }
};

// Removed legacy AI functions - now using Vercel AI SDK consistently

module.exports = {
  // Vercel AI SDK functions
  getAIInsights,
  getAIInsightsStream,
  chatWithAgent,
  chatWithAgentStream,
};