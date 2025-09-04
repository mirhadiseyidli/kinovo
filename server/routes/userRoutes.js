const express = require('express');
const { 
  getUserProfile,
  getUsers,
  deleteUsers,
  editMyProfile,
  createUser, 
  findMe,
  getUser,
  getUserFriendBySearch,
  getUserNonFriendBySearch,
  markStoriesViewed,
  requestAccountDeletion,
  cancelAccountDeletion,
  blockUser,
  unblockUser,
  getBlockedUsers,
  addActivityTag,
  removeActivityTag,
  addFriendsToTag,
  removeFriendsFromTag,
  getUserTags,
  searchUserTags,
  getFavoriteActivities,
  addFavoriteActivity,
  removeFavoriteActivity,
  removeProfilePicture,
  removeCoverPhoto,
  getUserImages,
  generateDefaultProfilePicture,
  updateUserProfile,
  deleteUserAccount,
  bypassTwoFactorAuth,
  getBypassTwoFactorAuth
} = require('../controllers/userController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');
const { userReadLimiter, userWriteLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Favorite Activities routes
router.get('/favorite-activities', authMiddleware, userReadLimiter, getFavoriteActivities);
router.post('/favorite-activities', authMiddleware, userWriteLimiter, addFavoriteActivity);
router.delete('/favorite-activities', authMiddleware, userWriteLimiter, removeFavoriteActivity);

// Tag management routes
router.post('/tags', authMiddleware, userWriteLimiter, addActivityTag);
router.delete('/tags', authMiddleware, userWriteLimiter, removeActivityTag);
router.post('/tags/friends', authMiddleware, userWriteLimiter, addFriendsToTag);
router.delete('/tags/friends', authMiddleware, userWriteLimiter, removeFriendsFromTag);
router.get('/tags', authMiddleware, userReadLimiter, getUserTags);
router.get('/tags/search', authMiddleware, userReadLimiter, searchUserTags);

// Blocked users routes
router.get('/blocked', authMiddleware, userReadLimiter, getBlockedUsers);
router.post('/block', authMiddleware, userWriteLimiter, blockUser);
router.post('/unblock', authMiddleware, userWriteLimiter, unblockUser);

// Account deletion routes
router.post('/delete-account', authMiddleware, userWriteLimiter, requestAccountDeletion);
router.post('/cancel-deletion', authMiddleware, userWriteLimiter, cancelAccountDeletion);

// Image management routes
router.get('/images', authMiddleware, userReadLimiter, getUserImages);
router.delete('/profile-picture', authMiddleware, userWriteLimiter, removeProfilePicture);
router.delete('/cover-photo', authMiddleware, userWriteLimiter, removeCoverPhoto);

// Generate default profile picture
router.post('/generate-profile-picture', authMiddleware, userWriteLimiter, generateDefaultProfilePicture);

// User profile and management routes
router.get('/me', authMiddleware, userReadLimiter, findMe);
router.post('/user/create', authMiddleware, userWriteLimiter, createUser);
router.get('/user/get/profile', authMiddleware, userReadLimiter, getUser, getUserProfile);
router.get('/me/friends/search/', authMiddleware, userReadLimiter, getUserFriendBySearch, getUserProfile);
router.get('/me/kinovo/users/search/', authMiddleware, userReadLimiter, getUserNonFriendBySearch, getUserProfile);
router.patch('/user/edit/myprofile', authMiddleware, userWriteLimiter, editMyProfile);
router.post('/user/stories/mark-viewed', authMiddleware, userWriteLimiter, markStoriesViewed);
router.post('/user/bypass-two-factor-auth', authMiddleware, userWriteLimiter, bypassTwoFactorAuth);
router.get('/user/bypass-two-factor-auth', userReadLimiter, getBypassTwoFactorAuth);

// Generic user routes - keep these last as they have less specific patterns
router.get('/', authMiddleware, userReadLimiter, getUsers);
router.delete('/:id', authMiddleware, userWriteLimiter, getUser, deleteUsers);

module.exports = router;
