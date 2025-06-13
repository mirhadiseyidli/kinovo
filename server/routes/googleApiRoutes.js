const express = require('express');
const { authMiddleware } = require('../utils/authMiddleware');
const { searchPlacesByText, geocodeAddress, getPlaceDetails, autocompletePlaces } = require('../controllers/googleApiController');

const router = express.Router();

// Google Places API endpoints
router.post('/places/search', authMiddleware, searchPlacesByText);
router.post('/places/autocomplete', authMiddleware, autocompletePlaces);
router.get('/geocode', authMiddleware, geocodeAddress);
router.get('/places/:placeId', authMiddleware, getPlaceDetails);

module.exports = router; 