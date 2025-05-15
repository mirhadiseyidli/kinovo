const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const { getWeather } = require('../controllers/appleWeatherController');

const router = express.Router();

router.get('/get/location/weather', authMiddleware, getWeather);

module.exports = router;