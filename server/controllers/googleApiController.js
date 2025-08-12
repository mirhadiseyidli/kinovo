const axios = require('axios');

/**
 * Search for places by text query
 * @route POST /api/google/places/search
 * @access Private
 */
const searchPlacesByText = async (req, res) => {
  const { latitude, longitude } = req.body;
  const radius = 50000;
  try {
    const { textQuery } = req.body;
    
    if (!textQuery) {
      return res.status(400).json({ message: 'Text query is required' });
    }

    const response = await axios.post(
      `https://places.googleapis.com/v1/places:searchText`,
      { textQuery: textQuery,
        locationBias: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude
            },
            radius: radius
          }
        }
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

/**
 * Get directions and traffic information between two points
 * @route GET /api/google/directions
 * @access Private
 */
const getDirections = async (req, res) => {
  try {
    const { origin, destination, departure_time, arrival_time, mode, traffic_model } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    const params = {
      origin,
      destination,
      key: process.env.GOOGLE_MAPS_API_KEY,
      mode: mode || 'driving', // driving, walking, bicycling, transit
      traffic_model: traffic_model || 'best_guess', // best_guess, pessimistic, optimistic
    };

    // Add departure time if provided (for traffic-aware routing)
    if (departure_time) {
      params.departure_time = departure_time;
    }

    // Add arrival time if provided (for transit)
    if (arrival_time) {
      params.arrival_time = arrival_time;
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json`,
      { params }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error in getDirections:', error);
    res.status(500).json({ 
      message: 'Server error fetching directions', 
      error: error.response?.data || error.message 
    });
  }
};

module.exports = {
  searchPlacesByText,
  autocompletePlaces,
  geocodeAddress,
  getPlaceDetails,
  getDirections
}; 