const express = require('express');
const { getDrones, requestDrone, createDrone, deleteDrone, editDrone, getDroneStat } = require('../controllers/droneController');
const { authMiddleware, checkRole } = require('../utils/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, checkRole(["admin", "member"]), getDrones);
router.post('/request/:id', authMiddleware, checkRole(["admin", "member"]), requestDrone);
router.post('/drone', authMiddleware, checkRole(["admin", "member"]), createDrone);
router.delete('/drone/:id', authMiddleware, checkRole(["admin", "member"]), deleteDrone);
router.patch('/drone/:id', authMiddleware, checkRole(["admin"]), editDrone)
router.get('/stats', authMiddleware, checkRole(["admin", "member"]), getDroneStat);

module.exports = router;
