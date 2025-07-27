import { 
  createStableQueryKeyWithParams, 
  createStableLocationQueryKey, 
  createStableTimeQueryKey,
  warnIfUnstableQueryKey
} from './stableQueryKey';

/**
 * Query Keys Factory for TanStack React Query
 * 
 * This factory provides a centralized way to manage query keys across the app.
 * It ensures consistency and helps with cache invalidation patterns.
 * Uses TanStack Query v5's built-in hashQueryKey for stable object parameters.
 */

export const queryKeys = {
  // Base keys
  all: ['events'] as const,
  
  // User-specific events
  userEvents: (userId: string) => [...queryKeys.all, 'user', userId] as const,
  
  // Upcoming events with stable parameters
  upcomingEvents: (userId: string, fromHomeScreen?: boolean) => {
    const baseKey = [...queryKeys.userEvents(userId), 'upcoming'] as const;
    const params = { fromHomeScreen: fromHomeScreen || false };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'upcomingEvents');
    return stableKey;
  },
  
  // Past events with stable date parameters
  pastEvents: (userId: string, year?: number, month?: number) => {
    const baseKey = [...queryKeys.userEvents(userId), 'past'] as const;
    const params = { 
      year: year || null, 
      month: month || null 
    };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'pastEvents');
    return stableKey;
  },
  
  // Attention required events with stable parameters
  attentionRequiredEvents: (userId: string, fromHomeScreen?: boolean) => {
    const baseKey = [...queryKeys.userEvents(userId), 'attention-required'] as const;
    const params = { fromHomeScreen: fromHomeScreen || false };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'attentionRequiredEvents');
    return stableKey;
  },
  
  // Location-based events with stable coordinates
  locationEvents: (lat: number, lng: number, distance: number) => {
    const baseKey = [...queryKeys.all, 'location'] as const;
    const stableKey = createStableLocationQueryKey(baseKey, lat, lng, { distance });
    warnIfUnstableQueryKey(stableKey, 'locationEvents');
    return stableKey;
  },
  
  nearbyEvents: (lat: number, lng: number, distance: number) => {
    const baseKey = [...queryKeys.all, 'location'] as const;
    const stableKey = createStableLocationQueryKey(baseKey, lat, lng, { distance, type: 'nearby' });
    warnIfUnstableQueryKey(stableKey, 'nearbyEvents');
    return stableKey;
  },
  
  // Paginated nearby events with stable coordinates
  paginatedNearbyEvents: (lat: number, lng: number, distance: number) => {
    const baseKey = [...queryKeys.all, 'location'] as const;
    const stableKey = createStableLocationQueryKey(baseKey, lat, lng, { distance, type: 'paginated' });
    warnIfUnstableQueryKey(stableKey, 'paginatedNearbyEvents');
    return stableKey;
  },
  
  // Social events
  friendsEvents: (userId: string) => 
    [...queryKeys.userEvents(userId), 'friends'] as const,
  
  // Specific user's events (for profile viewing)
  specificUserEvents: (viewerId: string, targetUserId: string) => 
    [...queryKeys.all, 'user-profile', viewerId, targetUserId] as const,
  
  // User event count (for profile display)
  userEventCount: (viewerId: string, targetUserId: string) => 
    [...queryKeys.all, 'user-event-count', viewerId, targetUserId] as const,
  
  // Individual event
  eventById: (eventId: string) => 
    [...queryKeys.all, 'single', eventId] as const,
  
  // Calendar events for date range with stable date parameters
  calendarEventsForDateRange: (startDate: Date, endDate: Date, forceRefresh?: boolean) => {
    const baseKey = [...queryKeys.all, 'calendar-range'] as const;
    const params = { 
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0],
      forceRefresh: forceRefresh || false
    };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'calendarEventsForDateRange');
    return stableKey;
  },

  // Calendar event occurrences for date range with stable date parameters
  calendarOccurrences: (startDate: Date, endDate: Date) => {
    const baseKey = [...queryKeys.all, 'calendar-occurrences'] as const;
    const params = { 
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0]
    };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'calendarOccurrences');
    return stableKey;
  },

  // Calendar events with stable date parameters
  calendarEvents: (userId: string, month: number, year: number) => {
    const baseKey = [...queryKeys.userEvents(userId), 'calendar'] as const;
    const params = { month, year };
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, 'calendarEvents');
    return stableKey;
  },
  
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
  
  // Infinite query keys
  infiniteEvents: (eventType: string, params: Record<string, any>) => {
    const baseKey = [...queryKeys.all, 'infinite', eventType] as const;
    const stableKey = createStableQueryKeyWithParams(baseKey, params);
    warnIfUnstableQueryKey(stableKey, `infinite-${eventType}`);
    return stableKey;
  },
  
  infiniteUpcoming: (userId: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('upcoming', { userId, ...params }),
  
  infinitePast: (userId: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('past', { userId, ...params }),
  
  infiniteNearby: (lat: number, lng: number, distance: number, params: Record<string, any> = {}) => {
    const locationParams = { lat, lng, distance };
    const stableKey = createStableLocationQueryKey(
      [...queryKeys.all, 'infinite', 'nearby'] as const, 
      lat, 
      lng, 
      { distance, ...params }
    );
    warnIfUnstableQueryKey(stableKey, 'infinite-nearby');
    return stableKey;
  },
  
  infiniteFriends: (userId: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('friends', { userId, ...params }),
  
  infiniteRecommended: (userId: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('recommended', { userId, ...params }),
  
  infiniteSearch: (query: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('search', { query, ...params }),
  
  infiniteUser: (userId: string, targetUserId: string, params: Record<string, any> = {}) => 
    queryKeys.infiniteEvents('user', { userId, targetUserId, ...params }),

  // Helper methods for cache invalidation
  invalidation: {
    // Invalidate all user-related queries
    allUserQueries: (userId: string) => queryKeys.userEvents(userId),
    
    // Invalidate all location-based queries
    allLocationQueries: () => [...queryKeys.all, 'location'],
    
    // Invalidate all queries for a specific event
    specificEventQueries: (eventId: string) => queryKeys.eventById(eventId),
    
    // Invalidate all search queries
    allSearchQueries: () => [...queryKeys.all, 'search'],
    
    // Invalidate all infinite queries
    allInfiniteQueries: () => [...queryKeys.all, 'infinite'],
    
    // Invalidate specific infinite query type
    infiniteQueriesByType: (eventType: string) => [...queryKeys.all, 'infinite', eventType],
    
    // Invalidate all event queries (nuclear option)
    allEventQueries: () => queryKeys.all,
  },
} as const;

/**
 * Type-safe query key creation with stable hashing
 * This ensures all query keys are properly typed and consistent
 * Uses TanStack Query v5's hashQueryKey for stable object parameters
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