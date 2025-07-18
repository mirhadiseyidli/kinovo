/**
 * Query Keys Factory for TanStack React Query
 * 
 * This factory provides a centralized way to manage query keys across the app.
 * It ensures consistency and helps with cache invalidation patterns.
 */

export const queryKeys = {
  // Base keys
  all: ['events'] as const,
  
  // User-specific events
  userEvents: (userId: string) => [...queryKeys.all, 'user', userId] as const,
  
  // Upcoming events
  upcomingEvents: (userId: string, fromHomeScreen?: boolean) => 
    [...queryKeys.userEvents(userId), 'upcoming', { fromHomeScreen }] as const,
  
  // Past events
  pastEvents: (userId: string, year?: number, month?: number) => 
    [...queryKeys.userEvents(userId), 'past', { year, month }] as const,
  
  // Attention required events
  attentionRequiredEvents: (userId: string, fromHomeScreen?: boolean) => 
    [...queryKeys.userEvents(userId), 'attention-required', { fromHomeScreen }] as const,
  
  // Location-based events
  locationEvents: (lat: number, lng: number, distance: number) => 
    [...queryKeys.all, 'location', { lat, lng, distance }] as const,
  
  nearbyEvents: (lat: number, lng: number, distance: number) => 
    [...queryKeys.locationEvents(lat, lng, distance), 'nearby'] as const,
  
  // Paginated nearby events
  paginatedNearbyEvents: (lat: number, lng: number, distance: number) => 
    [...queryKeys.locationEvents(lat, lng, distance), 'paginated'] as const,
  
  // Social events
  friendsEvents: (userId: string) => 
    [...queryKeys.userEvents(userId), 'friends'] as const,
  
  // Specific user's events (for profile viewing)
  specificUserEvents: (viewerId: string, targetUserId: string) => 
    [...queryKeys.all, 'user-profile', viewerId, targetUserId] as const,
  
  // Individual event
  eventById: (eventId: string) => 
    [...queryKeys.all, 'single', eventId] as const,
  
  // Calendar events
  calendarEvents: (userId: string, month: number, year: number) => 
    [...queryKeys.userEvents(userId), 'calendar', { month, year }] as const,
  
  // Recommended events
  recommendedEvents: (userId: string) => 
    [...queryKeys.userEvents(userId), 'recommended'] as const,
  
  // Search events
  searchEvents: (query: string) => 
    [...queryKeys.all, 'search', query] as const,
  
  // Search everything (users + events)
  searchEverything: (query: string) => 
    [...queryKeys.all, 'search-everything', query] as const,
  
  // Event count queries
  eventCount: (userId: string) => 
    [...queryKeys.userEvents(userId), 'count'] as const,
  
  friendsNewEventsCount: (userId: string) => 
    [...queryKeys.userEvents(userId), 'friends-new-count'] as const,
  
  // AI Summary cache
  aiSummary: (userId: string, eventId: string) => 
    [...queryKeys.all, 'ai-summary', userId, eventId] as const,
  
  // Helper methods for cache invalidation
  invalidation: {
    // Invalidate all user-related queries
    allUserQueries: (userId: string) => queryKeys.userEvents(userId),
    
    // Invalidate all location-based queries
    allLocationQueries: () => [...queryKeys.all, 'location'],
    
    // Invalidate all queries for a specific event
    allEventQueries: (eventId: string) => queryKeys.eventById(eventId),
    
    // Invalidate all search queries
    allSearchQueries: () => [...queryKeys.all, 'search'],
    
    // Invalidate all event queries (nuclear option)
    allEventQueries: () => queryKeys.all,
  },
} as const;

/**
 * Type-safe query key creation
 * This ensures all query keys are properly typed and consistent
 */
export type QueryKey = 
  | ReturnType<typeof queryKeys.upcomingEvents>
  | ReturnType<typeof queryKeys.pastEvents>
  | ReturnType<typeof queryKeys.attentionRequiredEvents>
  | ReturnType<typeof queryKeys.nearbyEvents>
  | ReturnType<typeof queryKeys.paginatedNearbyEvents>
  | ReturnType<typeof queryKeys.friendsEvents>
  | ReturnType<typeof queryKeys.specificUserEvents>
  | ReturnType<typeof queryKeys.eventById>
  | ReturnType<typeof queryKeys.calendarEvents>
  | ReturnType<typeof queryKeys.recommendedEvents>
  | ReturnType<typeof queryKeys.searchEvents>
  | ReturnType<typeof queryKeys.searchEverything>
  | ReturnType<typeof queryKeys.eventCount>
  | ReturnType<typeof queryKeys.friendsNewEventsCount>
  | ReturnType<typeof queryKeys.aiSummary>;