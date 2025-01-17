const express = require('express');
const { getUserProfile, getUsers, deleteUsers, editUser, createUser, findMe, getUser } = require('../controllers/userController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

// router.get('/me', authMiddleware, findMe);
// router.get('/', authMiddleware, getUsers);
// router.post('/', authMiddleware, createUser);
// router.get('/:id', authMiddleware, getUser, getUserProfile);
// router.delete('/:id', authMiddleware, getUser, deleteUsers);
// router.get('/:id', authMiddleware, editUser);

router.get('/me', findMe);
router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUser, getUserProfile);
router.delete('/:id', getUser, deleteUsers);
router.get('/:id', editUser);

module.exports = router;
