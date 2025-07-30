const express = require('express');
const { 
  getAIInsights,
  chatWithAgent,
} = require('../controllers/aiController');
const {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  updateConversation,
  deleteConversation,
  clearAllConversations,
} = require('../controllers/aiConversationController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

// Vercel AI SDK endpoints
router.get('/insights', authMiddleware, getAIInsights);
router.post('/agent', authMiddleware, chatWithAgent);

// Conversation management endpoints
router.get('/conversations', authMiddleware, getConversations);
router.get('/conversations/:conversationId', authMiddleware, getConversation);
router.post('/conversations', authMiddleware, createConversation);
router.post('/conversations/:conversationId/messages', authMiddleware, addMessage);
router.patch('/conversations/:conversationId', authMiddleware, updateConversation);
router.delete('/conversations/:conversationId', authMiddleware, deleteConversation);
router.delete('/conversations', authMiddleware, clearAllConversations);

module.exports = router;
