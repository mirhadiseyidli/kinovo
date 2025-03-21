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
  sendFriendRequest,
  respondToAFriendRequest
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
router.get('/', getUsers);
router.post('/', createUser);
router.get('/user/:id', getUser, getUserProfile);
router.get('/me/friends/:email', authMiddleware, getUserFriendByEmailSearch, getUserProfile);
router.get('/me/friends/:name', authMiddleware, getUserFriendByNameSearch, getUserProfile);
router.post('/user/friends/requests/actions', sendFriendRequest);
router.post('/user/friends/requests/responses', respondToAFriendRequest);
router.delete('/:id', getUser, deleteUsers);
router.patch('/user/edit/myprofile', authMiddleware, editMyProfile);

module.exports = router;
