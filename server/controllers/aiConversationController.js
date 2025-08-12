const AIConversation = require('../database/schemas/aiConversationsSchema');
const mongoose = require('mongoose');

/**
 * Get user's conversation list
 * GET /api/ai/conversations
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await AIConversation.findByUserId(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    const totalCount = await AIConversation.countDocuments({
      userId,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message,
    });
  }
};

/**
 * Get specific conversation with messages
 * GET /api/ai/conversations/:conversationId
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { messageLimit = 50 } = req.query;

    const conversation = await AIConversation.findByConversationId(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Limit messages if requested
    if (messageLimit && conversation.messages.length > messageLimit) {
      conversation.messages = conversation.messages.slice(-parseInt(messageLimit));
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: error.message,
    });
  }
};

/**
 * Create new conversation
 * POST /api/ai/conversations
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, initialMessage } = req.body;

    const conversation = AIConversation.createNewConversation(userId, initialMessage);
    
    if (title) {
      conversation.title = title;
    }

    await conversation.save();

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message,
    });
  }
};

/**
 * Add message to conversation
 * POST /api/ai/conversations/:conversationId/messages
 */
const addMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { role, content, toolCalls = [], messageId } = req.body;

    if (!role || !content) {
      return res.status(400).json({
        success: false,
        message: 'Role and content are required',
      });
    }

    const conversation = await AIConversation.findByConversationId(conversationId, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messageData = {
      id: messageId || new mongoose.Types.ObjectId().toString(),
      role,
      content,
      timestamp: new Date(),
      toolCalls,
    };

    conversation.addMessage(messageData);
    await conversation.save();

    res.json({
      success: true,
      data: {
        conversationId: conversation.conversationId,
        message: messageData,
        messageCount: conversation.messageCount,
      },
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message,
    });
  }
};

/**
 * Update conversation title
 * PATCH /api/ai/conversations/:conversationId
 */
const updateConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const conversation = await AIConversation.findOneAndUpdate(
      { conversationId, userId, isActive: true },
      { title: title.trim(), updatedAt: new Date() },
      { new: true, select: '-messages' }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation',
      error: error.message,
    });
  }
};

/**
 * Delete conversation (soft delete)
 * DELETE /api/ai/conversations/:conversationId
 */
const deleteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const conversation = await AIConversation.findOneAndUpdate(
      { conversationId, userId, isActive: true },
      { isActive: false, updatedAt: new Date() },
      { new: true, select: '_id conversationId isActive' }
    );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      data: { conversationId },
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message,
    });
  }
};

/**
 * Clear all conversations for user (soft delete)
 * DELETE /api/ai/conversations
 */
const clearAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await AIConversation.updateMany(
      { userId, isActive: true },
      { isActive: false, updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} conversations cleared`,
      data: { deletedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error('Error clearing conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversations',
      error: error.message,
    });
  }
};

module.exports = {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversation,
  deleteConversation,
  clearAllConversations,
};