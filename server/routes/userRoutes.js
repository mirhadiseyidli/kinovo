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

const router = express.Router();

// Favorite Activities routes
router.get('/favorite-activities', authMiddleware, getFavoriteActivities);
router.post('/favorite-activities', authMiddleware, addFavoriteActivity);
router.delete('/favorite-activities', authMiddleware, removeFavoriteActivity);

// Tag management routes
router.post('/tags', authMiddleware, addActivityTag);
router.delete('/tags', authMiddleware, removeActivityTag);
router.post('/tags/friends', authMiddleware, addFriendsToTag);
router.delete('/tags/friends', authMiddleware, removeFriendsFromTag);
router.get('/tags', authMiddleware, getUserTags);

// Blocked users routes
router.get('/blocked', authMiddleware, getBlockedUsers);
router.post('/block', authMiddleware, blockUser);
router.post('/unblock', authMiddleware, unblockUser);

// Account deletion routes
router.post('/delete-account', authMiddleware, requestAccountDeletion);
router.post('/cancel-deletion', authMiddleware, cancelAccountDeletion);

// Image management routes
router.get('/images', authMiddleware, getUserImages);
router.delete('/profile-picture', authMiddleware, removeProfilePicture);
router.delete('/cover-photo', authMiddleware, removeCoverPhoto);

// Generate default profile picture
router.post('/generate-profile-picture', authMiddleware, generateDefaultProfilePicture);

// User profile and management routes
router.get('/me', authMiddleware, findMe);
router.post('/user/create', authMiddleware, createUser);
router.get('/user/get/profile', authMiddleware, getUser, getUserProfile);
router.get('/me/friends/search/', authMiddleware, getUserFriendBySearch, getUserProfile);
router.get('/me/kinovo/users/search/', authMiddleware, getUserNonFriendBySearch, getUserProfile);
router.patch('/user/edit/myprofile', authMiddleware, editMyProfile);
router.post('/user/stories/mark-viewed', authMiddleware, markStoriesViewed);
router.post('/user/bypass-two-factor-auth', authMiddleware, bypassTwoFactorAuth);
router.get('/user/bypass-two-factor-auth', getBypassTwoFactorAuth);

// Generic user routes - keep these last as they have less specific patterns
router.get('/', authMiddleware, getUsers);
router.delete('/:id', authMiddleware, getUser, deleteUsers);

module.exports = router;
