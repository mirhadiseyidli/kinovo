// API Client for internal server calls
import axios from 'axios';

const API_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:5002';

export class APIClient {
  constructor(token) {
    this.token = token;
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: this.headers,
      };
      
      // Only add data for methods that support request body
      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Event endpoints
  async createEvent(eventData) {
    return this.request('POST', '/api/manageevents/eventslist/create/new/event', eventData);
  }

  async updateEvent(eventId, updateData) {
    return this.request('PUT', `/api/manageevents/eventslist/update/${eventId}`, updateData);
  }

  async cancelEvent(eventId) {
    return this.request('POST', '/api/manageevents/eventslist/cancel/event', { eventId });
  }

  async getEvent(eventId) {
    return this.request('GET', `/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
  }

  async getUserEvents(type = 'upcoming', limit = 10) {
    const params = { limit };
    const queryString = new URLSearchParams(params).toString();
    
    const endpoint = type === 'past' 
      ? `/api/manageevents/eventslist/get/my/past/events?${queryString}`
      : `/api/manageevents/eventslist/get/my/upcoming/events?${queryString}`;
      
    return this.request('GET', endpoint);
  }

  async searchEvents(params) {
    // If this is a location-based search without a query term, use nearby events endpoint
    if (params.lat && params.lng && !params.query) {
      const nearbyParams = {
        lat: params.lat,
        lng: params.lng,
        radius: params.radius || 10,
        ...(params.limit && { limit: params.limit }),
        ...(params.visibility && { visibility: params.visibility }),
      };
      const queryString = new URLSearchParams(nearbyParams).toString();
      return this.request('GET', `/api/manageevents/eventslist/get/nearby/events?${queryString}`);
    }
    
    // Otherwise use the search endpoint (requires query term)
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/api/search/events?${queryString}`);
  }

  // User/Friend endpoints
  async inviteUserToEvent(eventId, userId) {
    return this.request('POST', `/api/manageevents/eventslist/${eventId}/invite`, { inviteeId: userId });
  }

  async removeUserFromEvent(eventId, userId) {
    return this.request('POST', '/api/manageevents/eventslist/remove-attendee', { eventId, userId });
  }

  async joinEvent(eventId, status = 'accepted', occurrenceDate = null, modifyType = null) {
    const data = { eventId, status };
    if (occurrenceDate) data.occurrenceDate = occurrenceDate;
    if (modifyType) data.modifyType = modifyType;
    return this.request('POST', '/api/manageevents/eventslist/join', data);
  }

  // Weather endpoint
  async getWeather(lat, lng, date) {
    const params = { lat, lon: lng }; // Apple Weather expects 'lon' not 'lng'
    if (date) params.date = date;
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/api/weather/get/location/weather?${queryString}`);
  }

  // Google Maps endpoints for traffic
  async getDirections(origin, destination, departureTime, mode = 'driving') {
    const params = {
      origin: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
      destination: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
      mode,
      traffic_model: 'best_guess'
    };
    if (departureTime) {
      // Convert to Unix timestamp if it's a Date object or ISO string
      params.departure_time = typeof departureTime === 'string' 
        ? Math.floor(new Date(departureTime).getTime() / 1000)
        : Math.floor(departureTime / 1000);
    }
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/api/google/directions?${queryString}`);
  }
}