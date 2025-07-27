import api from '@/utils/api';
import { Event, ApiError } from '@/types/allTypes';

/**
 * Base query functions for TanStack React Query
 * These functions handle the actual API calls and error handling
 */

// Error handling utility
export const handleQueryError = (error: unknown): never => {
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('An unknown error occurred');
};

// Base query function with proper error handling
export const createQueryFunction = <T>(
  apiCall: () => Promise<T>
) => {
  return async (): Promise<T> => {
    try {
      return await apiCall();
    } catch (error) {
      return handleQueryError(error);
    }
  };
};

/**
 * Event Query Functions
 */

// Get upcoming events
export const getUpcomingEvents = async (
  userId: string,
  fromHomeScreen?: boolean
): Promise<Event[]> => {
  const params = fromHomeScreen ? '?fromHomeScreen=true' : '';
  const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events${params}`);
  return response.data.events || [];
};

// Get past events
export const getPastEvents = async (
  userId: string,
  year?: number,
  month?: number
): Promise<Event[]> => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const response = await api.get(`/api/manageevents/eventslist/get/my/past/events${queryString}`);
  return response.data.events || [];
};

// Get attention required events
export const getAttentionRequiredEvents = async (
  userId: string,
  fromHomeScreen?: boolean
): Promise<Event[]> => {
  const params = fromHomeScreen ? '?fromHomeScreen=true' : '';
  const response = await api.get(`/api/manageevents/eventslist/get/attention/required${params}`);
  return response.data.events || [];
};

// Get nearby events
export const getNearbyEvents = async (
  lat: number,
  lng: number,
  distance: number
): Promise<Event[]> => {
  const response = await api.get(
    `/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}`
  );
  return response.data.events || [];
};

// Get nearby events preview (first 5)
export const getNearbyEventsPreview = async (
  lat: number,
  lng: number,
  distance: number
): Promise<{ events: Event[]; totalCount: number }> => {
  const response = await api.get(
    `/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}&limit=5`
  );
  return {
    events: response.data.events || [],
    totalCount: response.data.totalCount || 0,
  };
};

// Get paginated nearby events
export const getPaginatedNearbyEvents = async (
  lat: number,
  lng: number,
  distance: number,
  page: number = 1,
  limit: number = 5
): Promise<{ events: Event[]; totalCount: number; hasMore: boolean }> => {
  const response = await api.get(
    `/api/manageevents/eventslist/get/nearby/events?lat=${lat}&lng=${lng}&distance=${distance}&page=${page}&limit=${limit}`
  );
  return {
    events: response.data.events || [],
    totalCount: response.data.totalCount || 0,
    hasMore: response.data.hasMore || false,
  };
};

// Get friends events
export const getFriendsEvents = async (userId: string): Promise<Event[]> => {
  const response = await api.get('/api/manageevents/eventslist/friends');
  return response.data.events || [];
};

// Get user events (for profile viewing)
export const getUserEvents = async (
  viewerId: string,
  targetUserId: string
): Promise<Event[]> => {
  const response = await api.get(`/api/manageevents/eventslist/get/user/events?_id=${targetUserId}`);
  return response.data.events || [];
};

// Get event by ID
export const getEventById = async (eventId: string): Promise<Event> => {
  const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
  return response.data.event;
};

// Get calendar events for date range (used by EventContext)
export const getCalendarEventsForDateRange = async (
  startDate: Date,
  endDate: Date,
  forceRefresh?: boolean
): Promise<Event[]> => {
  const cacheParam = forceRefresh ? `&_t=${Date.now()}` : '';
  const start = startDate.toISOString().split('T')[0]; // Format as yyyy-MM-dd
  const end = endDate.toISOString().split('T')[0]; // Format as yyyy-MM-dd
  const response = await api.get(
    `/api/manageevents/eventslist/get/my/events/range?start=${start}&end=${end}${cacheParam}`
  );
  return response.data.events || [];
};

// Get calendar events
export const getCalendarEvents = async (
  userId: string,
  month: number,
  year: number
): Promise<Event[]> => {
  const response = await api.get(
    `/api/manageevents/eventslist/get/my/events/month/view?month=${month}&year=${year}`
  );
  return response.data.events || [];
};

// Get recommended events
export const getRecommendedEvents = async (userId: string): Promise<Event[]> => {
  const response = await api.get('/api/manageevents/eventslist/get/recommended');
  return response.data.events || [];
};

// Search events
export const searchEvents = async (query: string): Promise<Event[]> => {
  const response = await api.get(`/api/search/events?query=${encodeURIComponent(query)}`);
  return response.data.events || [];
};

// Search everything (users + events)
export const searchEverything = async (query: string): Promise<{
  users: any[];
  events: Event[];
}> => {
  const [usersResponse, eventsResponse] = await Promise.all([
    api.get(`/api/search/users?query=${encodeURIComponent(query)}`),
    api.get(`/api/search/events?query=${encodeURIComponent(query)}`),
  ]);

  return {
    users: usersResponse.data.users || [],
    events: eventsResponse.data.events || [],
  };
};

// Get event count
export const getEventCount = async (userId: string): Promise<number> => {
  const response = await api.get('/api/manageevents/eventslist/count');
  return response.data.count || 0;
};

// Get friends new events count
export const getFriendsNewEventsCount = async (userId: string): Promise<number> => {
  const response = await api.get('/api/manageevents/eventslist/friends/new/count');
  return response.data.count || 0;
};

/**
 * Mutation Functions
 */

// Create event
export const createEvent = async (eventData: Partial<Event>): Promise<{success: boolean, event: Event}> => {
  const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
  return response.data;
};

// Update event
export const updateEvent = async (
  eventId: string, 
  eventData: Partial<Event>, 
  options?: { occurrenceDate?: Date; modifyType?: 'this_only' | 'all_instances' }
): Promise<{success: boolean, event: Event}> => {
  const requestBody = {
    ...eventData,
    ...(options?.occurrenceDate && { occurrenceDate: options.occurrenceDate }),
    ...(options?.modifyType && { modifyType: options.modifyType })
  };
  
  const response = await api.put(`/api/manageevents/eventslist/update/${eventId}`, requestBody);
  return response.data;
};

// Delete event (actually cancels the event)
export const deleteEvent = async (eventId: string): Promise<void> => {
  await api.post(`/api/manageevents/eventslist/cancel/event`, { eventId });
};

// Respond to event invitation
export const respondToInvitation = async (
  eventId: string,
  response: 'accept' | 'decline' | 'maybe'
): Promise<Event> => {
  const apiResponse = await api.post(`/api/manageevents/invitation/respond`, {
    eventId,
    response,
  });
  return apiResponse.data.event;
};

/**
 * Query function factories
 * These create the actual query functions used by React Query hooks
 */

export const queryFunctions = {
  // User events
  upcomingEvents: (userId: string, fromHomeScreen?: boolean) =>
    createQueryFunction(() => getUpcomingEvents(userId, fromHomeScreen)),
  
  pastEvents: (userId: string, year?: number, month?: number) =>
    createQueryFunction(() => getPastEvents(userId, year, month)),
  
  attentionRequiredEvents: (userId: string, fromHomeScreen?: boolean) =>
    createQueryFunction(() => getAttentionRequiredEvents(userId, fromHomeScreen)),
  
  // Location events
  nearbyEvents: (lat: number, lng: number, distance: number) =>
    createQueryFunction(() => getNearbyEvents(lat, lng, distance)),
  
  nearbyEventsPreview: (lat: number, lng: number, distance: number) =>
    createQueryFunction(() => getNearbyEventsPreview(lat, lng, distance)),
  
  // Social events
  friendsEvents: (userId: string) =>
    createQueryFunction(() => getFriendsEvents(userId)),
  
  userEvents: (viewerId: string, targetUserId: string) =>
    createQueryFunction(() => getUserEvents(viewerId, targetUserId)),
  
  // Individual event
  eventById: (eventId: string) =>
    createQueryFunction(() => getEventById(eventId)),
  
  // Calendar
  calendarEvents: (userId: string, month: number, year: number) =>
    createQueryFunction(() => getCalendarEvents(userId, month, year)),
  
  // Discovery
  recommendedEvents: (userId: string) =>
    createQueryFunction(() => getRecommendedEvents(userId)),
  
  // Search
  searchEvents: (query: string) =>
    createQueryFunction(() => searchEvents(query)),
  
  searchEverything: (query: string) =>
    createQueryFunction(() => searchEverything(query)),
  
  // Counts
  eventCount: (userId: string) =>
    createQueryFunction(() => getEventCount(userId)),
  
  friendsNewEventsCount: (userId: string) =>
    createQueryFunction(() => getFriendsNewEventsCount(userId)),
};