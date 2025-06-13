const axios = require('axios');

/**
 * Search for places by text query
 * @route POST /api/google/places/search
 * @access Private
 */
const searchPlacesByText = async (req, res) => {
    console.log('api key', process.env.GOOGLE_MAPS_API_KEY);
  try {
    const { textQuery } = req.body;
    
    if (!textQuery) {
      return res.status(400).json({ message: 'Text query is required' });
    }

    const response = await axios.post(
      `https://places.googleapis.com/v1/places:searchText`,
      { textQuery: textQuery },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "*",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in searchPlacesByText:', error);
    res.status(500).json({ 
      message: 'Server error fetching places', 
      error: error.response?.data || error.message 
    });
  }
};

/**
 * Autocomplete place search
 * @route POST /api/google/places/autocomplete
 * @access Private
 */
const autocompletePlaces = async (req, res) => {
  try {
    const { input, includedPrimaryTypes } = req.body;
    
    if (!input) {
      return res.status(400).json({ message: 'Input is required' });
    }

    const response = await axios.post(
      `https://places.googleapis.com/v1/places:autocomplete`,
      { 
        input,
        includedPrimaryTypes: includedPrimaryTypes || [] 
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "*",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in autocompletePlaces:', error);
    res.status(500).json({ 
      message: 'Server error autocompleting places', 
      error: error.response?.data || error.message 
    });
  }
};

/**
 * Geocode an address to get coordinates
 * @route GET /api/google/geocode
 * @access Private
 */
const geocodeAddress = async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    res.status(500).json({ 
      message: 'Server error geocoding address', 
      error: error.response?.data || error.message 
    });
  }
};

/**
 * Get place details by ID
 * @route GET /api/google/places/:placeId
 * @access Private
 */
const getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;
    const { fields } = req.query;
    
    if (!placeId) {
      return res.status(400).json({ message: 'Place ID is required' });
    }

    const fieldsToFetch = fields || 'location,addressComponents';

    const response = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        params: {
          fields: fieldsToFetch,
        },
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    res.status(500).json({ 
      message: 'Server error fetching place details', 
      error: error.response?.data || error.message 
    });
  }
};

module.exports = {
  searchPlacesByText,
  autocompletePlaces,
  geocodeAddress,
  getPlaceDetails
}; 