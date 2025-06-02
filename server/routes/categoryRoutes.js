const express = require('express');
const { getCategories, addCategory, updateCategory } = require('../controllers/categoryController');
const { authMiddleware } = require('../utils/authMiddleware');

const router = express.Router();

// Public routes
router.get('/categories', getCategories);

// Protected routes (admin only)
router.post('/categories', authMiddleware, addCategory);
router.put('/categories/:id', authMiddleware, updateCategory);

module.exports = router; 