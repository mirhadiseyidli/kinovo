const express = require('express');
const { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editMyProfile,
  createUser, 
  findMe,
  getUser,
  getUserFriendByEmailSearch,
  getUserFriendByNameSearch,
} = require('../controllers/userController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, findMe);
// router.get('/', authMiddleware, getUsers);
// router.post('/', authMiddleware, createUser);
// router.get('/:id', authMiddleware, getUser, getUserProfile);
// router.delete('/:id', authMiddleware, getUser, deleteUsers);
// router.get('/:id', authMiddleware, editUser);

// router.get('/me', findMe);
router.get('/', authMiddleware, getUsers);
router.post('/user/create', authMiddleware, createUser);
router.get('/user/get/profile', authMiddleware, getUser, getUserProfile);
router.get('/me/friends/search/by/email', authMiddleware, getUserFriendByEmailSearch, getUserProfile);
router.get('/me/friends/search/by/name', authMiddleware, getUserFriendByNameSearch, getUserProfile);
router.delete('/:id', getUser, deleteUsers);
router.patch('/user/edit/myprofile', authMiddleware, editMyProfile);

module.exports = router;
