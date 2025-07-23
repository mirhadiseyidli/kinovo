import { rest } from 'msw';
import { 
  mockEvents, 
  mockUsers, 
  mockPaginatedEvents,
  createMockEvent,
  createMockPaginatedResponse,
} from './mockData';

/**
 * MSW Request Handlers for TanStack Query Testing
 * 
 * This module provides comprehensive mock API handlers for testing
 * all TanStack Query functionality including CRUD operations,
 * infinite queries, and error scenarios.
 */

const BASE_URL = 'http://localhost:3000';

export const handlers = [
  // Events API handlers
  
  // Get upcoming events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/get/my/upcoming/events`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const fromHomeScreen = req.url.searchParams.get('fromHomeScreen') === 'true';
    
    let events = mockEvents.upcoming;
    
    if (fromHomeScreen) {
      events = events.slice(0, 3);
    }
    
    const response = createMockPaginatedResponse(events, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get past events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/get/my/past/events`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    
    const response = createMockPaginatedResponse(mockEvents.past, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get nearby events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/get/nearby/events`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const lat = parseFloat(req.url.searchParams.get('lat') || '37.7749');
    const lng = parseFloat(req.url.searchParams.get('lng') || '-122.4194');
    const distance = parseInt(req.url.searchParams.get('distance') || '10');
    
    // Filter events by distance (simplified for testing)
    const nearbyEvents = mockEvents.nearby.filter(event => {
      if (!event.latitude || !event.longitude) return false;
      const eventDistance = Math.sqrt(
        Math.pow(event.latitude - lat, 2) + Math.pow(event.longitude - lng, 2)
      );
      return eventDistance <= distance;
    });
    
    const response = createMockPaginatedResponse(nearbyEvents, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get friends events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/friends`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    
    const response = createMockPaginatedResponse(mockEvents.friends, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get recommended events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/get/recommended`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    
    const response = createMockPaginatedResponse(mockEvents.recommended, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Search events
  rest.get(`${BASE_URL}/api/search/events`, (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const query = req.url.searchParams.get('q') || '';
    const category = req.url.searchParams.get('category');
    
    let searchResults = mockEvents.search;
    
    if (query) {
      searchResults = searchResults.filter(event => 
        event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.description.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (category) {
      searchResults = searchResults.filter(event => event.category === category);
    }
    
    const response = createMockPaginatedResponse(searchResults, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get user events
  rest.get(`${BASE_URL}/api/manageevents/eventslist/get/user/:userId`, (req, res, ctx) => {
    const { userId } = req.params;
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    
    const userEvents = mockEvents.upcoming.filter(event => event.createdBy === userId);
    const response = createMockPaginatedResponse(userEvents, page, limit);
    
    return res(
      ctx.status(200),
      ctx.json(response)
    );
  }),
  
  // Get single event
  rest.get(`${BASE_URL}/api/manageevents/event/:eventId`, (req, res, ctx) => {
    const { eventId } = req.params;
    
    const allEvents = [
      ...mockEvents.upcoming,
      ...mockEvents.past,
      ...mockEvents.nearby,
      ...mockEvents.friends,
      ...mockEvents.recommended,
      ...mockEvents.search,
    ];
    
    const event = allEvents.find(e => e.id === eventId);
    
    if (!event) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Event not found' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json(event)
    );
  }),
  
  // Create event
  rest.post(`${BASE_URL}/api/manageevents/create`, async (req, res, ctx) => {
    const eventData = await req.json();
    
    // Simulate validation
    if (!eventData.title || !eventData.startTime || !eventData.endTime) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Missing required fields' })
      );
    }
    
    // Create new event
    const newEvent = createMockEvent({
      ...eventData,
      id: `event-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Add to mock data
    mockEvents.upcoming.unshift(newEvent);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'Event created successfully',
        ...newEvent,
      })
    );
  }),
  
  // Update event
  rest.put(`${BASE_URL}/api/manageevents/update/:eventId`, async (req, res, ctx) => {
    const { eventId } = req.params;
    const updateData = await req.json();
    
    // Find event in all arrays
    const eventArrays = [
      mockEvents.upcoming,
      mockEvents.past,
      mockEvents.nearby,
      mockEvents.friends,
      mockEvents.recommended,
      mockEvents.search,
    ];
    
    let eventFound = false;
    let updatedEvent = null;
    
    for (const events of eventArrays) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        updatedEvent = {
          ...events[eventIndex],
          ...updateData,
          updatedAt: new Date().toISOString(),
        };
        events[eventIndex] = updatedEvent;
        eventFound = true;
        break;
      }
    }
    
    if (!eventFound) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Event not found' })
      );
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Event updated successfully',
        ...updatedEvent,
      })
    );
  }),
  
  // Delete event
  rest.delete(`${BASE_URL}/api/manageevents/delete/:eventId`, async (req, res, ctx) => {
    const { eventId } = req.params;
    
    // Remove from all arrays
    const eventArrays = [
      mockEvents.upcoming,
      mockEvents.past,
      mockEvents.nearby,
      mockEvents.friends,
      mockEvents.recommended,
      mockEvents.search,
    ];
    
    let eventFound = false;
    
    for (const events of eventArrays) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        events.splice(eventIndex, 1);
        eventFound = true;
        break;
      }
    }
    
    if (!eventFound) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Event not found' })
      );
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Event deleted successfully',
      })
    );
  }),
  
  // Join event
  rest.post(`${BASE_URL}/api/manageevents/join/:eventId`, async (req, res, ctx) => {
    const { eventId } = req.params;
    const { userId } = await req.json();
    
    // Find event
    const eventArrays = [
      mockEvents.upcoming,
      mockEvents.nearby,
      mockEvents.friends,
      mockEvents.recommended,
      mockEvents.search,
    ];
    
    let eventFound = false;
    let updatedEvent = null;
    
    for (const events of eventArrays) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        if (!event.participants.includes(userId)) {
          event.participants.push(userId);
        }
        updatedEvent = event;
        eventFound = true;
        break;
      }
    }
    
    if (!eventFound) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Event not found' })
      );
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Successfully joined event',
        event: updatedEvent,
      })
    );
  }),
  
  // Leave event
  rest.post(`${BASE_URL}/api/manageevents/leave/:eventId`, async (req, res, ctx) => {
    const { eventId } = req.params;
    const { userId } = await req.json();
    
    // Find event
    const eventArrays = [
      mockEvents.upcoming,
      mockEvents.nearby,
      mockEvents.friends,
      mockEvents.recommended,
      mockEvents.search,
    ];
    
    let eventFound = false;
    let updatedEvent = null;
    
    for (const events of eventArrays) {
      const eventIndex = events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        event.participants = event.participants.filter(id => id !== userId);
        updatedEvent = event;
        eventFound = true;
        break;
      }
    }
    
    if (!eventFound) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Event not found' })
      );
    }
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Successfully left event',
        event: updatedEvent,
      })
    );
  }),
  
  // Error simulation handlers
  
  // Simulate network error
  rest.get(`${BASE_URL}/api/test/network-error`, (req, res, ctx) => {
    return res.networkError('Network request failed');
  }),
  
  // Simulate server error
  rest.get(`${BASE_URL}/api/test/server-error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  }),
  
  // Simulate timeout
  rest.get(`${BASE_URL}/api/test/timeout`, (req, res, ctx) => {
    return res(
      ctx.delay(10000), // 10 second delay to simulate timeout
      ctx.status(200),
      ctx.json({ message: 'This should timeout' })
    );
  }),
  
  // Simulate slow response
  rest.get(`${BASE_URL}/api/test/slow-response`, (req, res, ctx) => {
    return res(
      ctx.delay(2000), // 2 second delay
      ctx.status(200),
      ctx.json({ message: 'Slow response' })
    );
  }),
  
  // Simulate rate limiting
  rest.get(`${BASE_URL}/api/test/rate-limit`, (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({ error: 'Rate limit exceeded' })
    );
  }),
  
  // Simulate unauthorized
  rest.get(`${BASE_URL}/api/test/unauthorized`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({ error: 'Unauthorized' })
    );
  }),
  
  // Simulate forbidden
  rest.get(`${BASE_URL}/api/test/forbidden`, (req, res, ctx) => {
    return res(
      ctx.status(403),
      ctx.json({ error: 'Forbidden' })
    );
  }),
  
  // Simulate not found
  rest.get(`${BASE_URL}/api/test/not-found`, (req, res, ctx) => {
    return res(
      ctx.status(404),
      ctx.json({ error: 'Not found' })
    );
  }),
];

// Handler utilities for dynamic testing
export const createDynamicHandler = (
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  responseData: any,
  options: {
    status?: number;
    delay?: number;
    error?: boolean;
  } = {}
) => {
  const { status = 200, delay = 0, error = false } = options;
  
  return rest[method](`${BASE_URL}${path}`, (req, res, ctx) => {
    if (error) {
      return res.networkError('Simulated network error');
    }
    
    return res(
      ctx.delay(delay),
      ctx.status(status),
      ctx.json(responseData)
    );
  });
};

export const addTestHandler = (handler: any) => {
  handlers.push(handler);
};

export const removeTestHandler = (path: string) => {
  const index = handlers.findIndex(h => h.info.path === path);
  if (index !== -1) {
    handlers.splice(index, 1);
  }
};

export const resetMockData = () => {
  // Reset all mock data to initial state
  mockEvents.upcoming = mockPaginatedEvents.upcoming.slice();
  mockEvents.past = mockPaginatedEvents.past.slice();
  mockEvents.nearby = mockPaginatedEvents.nearby.slice();
  mockEvents.friends = mockPaginatedEvents.friends.slice();
  mockEvents.recommended = mockPaginatedEvents.recommended.slice();
  mockEvents.search = mockPaginatedEvents.search.slice();
};