// AI Controller for Vercel AI SDK endpoints
const path = require('path');
const mongoose = require('mongoose');
const AIConversation = require('../database/schemas/aiConversationsSchema');

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
    };

    // Call the handler
    const response = await handler(edgeRequest);
    
    if (isStreaming && response.body) {
      // Handle streaming response for agent
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
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
  
  return data;
};

/**
 * Save conversation to MongoDB
 */
const saveConversationToMongoDB = async (userId, aiResponse) => {
  try {
    const { conversationId, content, userMessage } = aiResponse;
    
    const assistantMessage = {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'assistant',
      content: content,
      timestamp: new Date(),
      toolCalls: [], // TODO: Extract tool calls from result if available
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

    console.log(`💾 Conversation saved: ${conversation.conversationId} (${conversation?.messageCount || 0} messages)`);
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

// Removed legacy AI functions - now using Vercel AI SDK consistently

module.exports = {
  // Vercel AI SDK functions
  getAIInsights,
  chatWithAgent,
};