/**
 * Mock Data for TanStack Query Testing
 * 
 * This module provides comprehensive mock data for testing
 * all aspects of the events application including events,
 * users, and paginated responses.
 */

// Mock user data
export const mockUsers = {
  currentUser: {
    id: 'mock-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    profile_picture: 'https://example.com/avatar.jpg',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  
  friends: [
    {
      id: 'friend-1',
      email: 'friend1@example.com',
      full_name: 'Friend One',
      profile_picture: 'https://example.com/friend1.jpg',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'friend-2',
      email: 'friend2@example.com',
      full_name: 'Friend Two',
      profile_picture: 'https://example.com/friend2.jpg',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ],
};

// Mock event factory
export const createMockEvent = (overrides = {}) => ({
  id: `event-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Mock Event',
  description: 'This is a mock event for testing',
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
  location: 'Mock Location',
  latitude: 37.7749,
  longitude: -122.4194,
  category: 'social',
  isPublic: true,
  createdBy: 'mock-user-id',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  participants: ['mock-user-id'],
  images: [],
  maxParticipants: 100,
  isRecurring: false,
  recurringPattern: null,
  creator: mockUsers.currentUser,
  ...overrides,
});

// Mock paginated response factory
export const createMockPaginatedResponse = (events: any[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const pageEvents = events.slice(start, end);
  
  return {
    events: pageEvents,
    totalCount: events.length,
    hasMore: end < events.length,
    currentPage: page,
    totalPages: Math.ceil(events.length / limit),
    nextCursor: end < events.length ? `cursor-${end}` : null,
  };
};

// Generate mock events for different categories
const generateMockEvents = (count: number, category: string, baseTime: number = Date.now()) => {
  return Array.from({ length: count }, (_, index) => createMockEvent({
    id: `${category}-event-${index}`,
    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Event ${index + 1}`,
    description: `This is a mock ${category} event for testing purposes`,
    startTime: new Date(baseTime + (index * 24 * 60 * 60 * 1000)).toISOString(),
    endTime: new Date(baseTime + (index * 24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000)).toISOString(),
    location: `${category} Location ${index + 1}`,
    latitude: 37.7749 + (index * 0.001),
    longitude: -122.4194 + (index * 0.001),
    category: category === 'upcoming' ? 'social' : category,
    participants: ['mock-user-id', ...(index % 2 === 0 ? ['friend-1'] : ['friend-2'])],
    creator: index % 3 === 0 ? mockUsers.friends[0] : mockUsers.currentUser,
    createdBy: index % 3 === 0 ? 'friend-1' : 'mock-user-id',
  }));
};

// Pre-generated mock events for different scenarios
export const mockPaginatedEvents = {
  upcoming: generateMockEvents(25, 'upcoming', Date.now() + 24 * 60 * 60 * 1000),
  past: generateMockEvents(30, 'past', Date.now() - 30 * 24 * 60 * 60 * 1000),
  nearby: generateMockEvents(15, 'nearby', Date.now() + 12 * 60 * 60 * 1000),
  friends: generateMockEvents(20, 'friends', Date.now() + 6 * 60 * 60 * 1000),
  recommended: generateMockEvents(18, 'recommended', Date.now() + 48 * 60 * 60 * 1000),
  search: generateMockEvents(50, 'search', Date.now() + 24 * 60 * 60 * 1000),
};

// Mutable mock data that can be modified during tests
export const mockEvents = {
  upcoming: [...mockPaginatedEvents.upcoming],
  past: [...mockPaginatedEvents.past],
  nearby: [...mockPaginatedEvents.nearby],
  friends: [...mockPaginatedEvents.friends],
  recommended: [...mockPaginatedEvents.recommended],
  search: [...mockPaginatedEvents.search],
};

// Mock data for specific test scenarios
export const mockEventScenarios = {
  // Event with no participants
  emptyEvent: createMockEvent({
    id: 'empty-event',
    title: 'Empty Event',
    participants: [],
  }),
  
  // Event at capacity
  fullEvent: createMockEvent({
    id: 'full-event',
    title: 'Full Event',
    maxParticipants: 2,
    participants: ['mock-user-id', 'friend-1'],
  }),
  
  // Recurring event
  recurringEvent: createMockEvent({
    id: 'recurring-event',
    title: 'Recurring Event',
    isRecurring: true,
    recurringPattern: {
      frequency: 'weekly',
      interval: 1,
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
  }),
  
  // Private event
  privateEvent: createMockEvent({
    id: 'private-event',
    title: 'Private Event',
    isPublic: false,
    participants: ['mock-user-id'],
  }),
  
  // Event with images
  eventWithImages: createMockEvent({
    id: 'event-with-images',
    title: 'Event with Images',
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ],
  }),
  
  // Event created by friend
  friendEvent: createMockEvent({
    id: 'friend-event',
    title: 'Friend Event',
    createdBy: 'friend-1',
    creator: mockUsers.friends[0],
    participants: ['friend-1', 'mock-user-id'],
  }),
  
  // Event in different categories
  businessEvent: createMockEvent({
    id: 'business-event',
    title: 'Business Event',
    category: 'business',
    description: 'A professional networking event',
  }),
  
  sportsEvent: createMockEvent({
    id: 'sports-event',
    title: 'Sports Event',
    category: 'sports',
    description: 'A fun sports activity',
  }),
  
  cultureEvent: createMockEvent({
    id: 'culture-event',
    title: 'Culture Event',
    category: 'culture',
    description: 'A cultural celebration',
  }),
  
  // Event with specific location
  sanFranciscoEvent: createMockEvent({
    id: 'sf-event',
    title: 'San Francisco Event',
    location: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
  }),
  
  newYorkEvent: createMockEvent({
    id: 'ny-event',
    title: 'New York Event',
    location: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.0060,
  }),
};

// Mock error scenarios
export const mockErrorScenarios = {
  networkError: {
    name: 'NetworkError',
    message: 'Network request failed',
  },
  
  serverError: {
    name: 'ServerError',
    message: 'Internal server error',
    status: 500,
  },
  
  notFoundError: {
    name: 'NotFoundError',
    message: 'Event not found',
    status: 404,
  },
  
  unauthorizedError: {
    name: 'UnauthorizedError',
    message: 'Unauthorized access',
    status: 401,
  },
  
  forbiddenError: {
    name: 'ForbiddenError',
    message: 'Access forbidden',
    status: 403,
  },
  
  validationError: {
    name: 'ValidationError',
    message: 'Validation failed',
    status: 400,
    errors: {
      title: 'Title is required',
      startTime: 'Start time must be in the future',
    },
  },
  
  timeoutError: {
    name: 'TimeoutError',
    message: 'Request timeout',
    code: 'TIMEOUT',
  },
  
  rateLimitError: {
    name: 'RateLimitError',
    message: 'Rate limit exceeded',
    status: 429,
  },
};

// Mock performance scenarios
export const mockPerformanceScenarios = {
  fastResponse: {
    delay: 10,
    events: mockPaginatedEvents.upcoming.slice(0, 5),
  },
  
  slowResponse: {
    delay: 2000,
    events: mockPaginatedEvents.upcoming.slice(0, 10),
  },
  
  largeDataset: {
    delay: 100,
    events: Array.from({ length: 1000 }, (_, i) => createMockEvent({
      id: `large-event-${i}`,
      title: `Large Dataset Event ${i + 1}`,
    })),
  },
  
  emptyDataset: {
    delay: 50,
    events: [],
  },
};

// Utility functions for test data manipulation
export const addMockEvent = (eventData: any, category: keyof typeof mockEvents = 'upcoming') => {
  const event = createMockEvent(eventData);
  mockEvents[category].unshift(event);
  return event;
};

export const removeMockEvent = (eventId: string, category?: keyof typeof mockEvents) => {
  if (category) {
    const index = mockEvents[category].findIndex(e => e.id === eventId);
    if (index !== -1) {
      mockEvents[category].splice(index, 1);
    }
  } else {
    // Remove from all categories
    Object.values(mockEvents).forEach(events => {
      const index = events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        events.splice(index, 1);
      }
    });
  }
};

export const updateMockEvent = (eventId: string, updates: any, category?: keyof typeof mockEvents) => {
  if (category) {
    const index = mockEvents[category].findIndex(e => e.id === eventId);
    if (index !== -1) {
      mockEvents[category][index] = { ...mockEvents[category][index], ...updates };
      return mockEvents[category][index];
    }
  } else {
    // Update in all categories
    Object.values(mockEvents).forEach(events => {
      const index = events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        events[index] = { ...events[index], ...updates };
      }
    });
  }
};

export const resetMockEvents = () => {
  mockEvents.upcoming = [...mockPaginatedEvents.upcoming];
  mockEvents.past = [...mockPaginatedEvents.past];
  mockEvents.nearby = [...mockPaginatedEvents.nearby];
  mockEvents.friends = [...mockPaginatedEvents.friends];
  mockEvents.recommended = [...mockPaginatedEvents.recommended];
  mockEvents.search = [...mockPaginatedEvents.search];
};

export const getMockEvent = (eventId: string, category?: keyof typeof mockEvents) => {
  if (category) {
    return mockEvents[category].find(e => e.id === eventId);
  }
  
  // Search in all categories
  for (const events of Object.values(mockEvents)) {
    const event = events.find(e => e.id === eventId);
    if (event) return event;
  }
  
  return null;
};

// Export specific test data sets
export const testDataSets = {
  smallDataset: {
    events: mockPaginatedEvents.upcoming.slice(0, 5),
    totalCount: 5,
  },
  
  mediumDataset: {
    events: mockPaginatedEvents.upcoming.slice(0, 25),
    totalCount: 25,
  },
  
  largeDataset: {
    events: mockPaginatedEvents.upcoming,
    totalCount: mockPaginatedEvents.upcoming.length,
  },
  
  emptyDataset: {
    events: [],
    totalCount: 0,
  },
  
  mixedDataset: {
    events: [
      ...mockPaginatedEvents.upcoming.slice(0, 3),
      ...mockPaginatedEvents.friends.slice(0, 2),
      ...mockPaginatedEvents.nearby.slice(0, 2),
    ],
    totalCount: 7,
  },
};