/**
 * Query Keys for TanStack React Query
 * 
 * Simplified query keys for the new architecture.
 * No more complex stable key hashing - TanStack Query v5 handles this internally.
 */

export const QUERY_KEYS = {
  // Base key for all events
  EVENTS: ['events'] as const,
  
  // Single event by ID
  SINGLE_EVENT: (eventId: string) => ['events', 'single', eventId] as const,
  
  // Calendar queries
  CALENDAR: ['events', 'calendar'] as const,
  CALENDAR_MONTH: (month: number, year: number) => ['events', 'calendar', month, year] as const,
  CALENDAR_RANGE: (startDate: Date, endDate: Date) => ['events', 'calendar-range', startDate, endDate] as const,
  CALENDAR_OPTIMAL: (view: string, startDate: Date, endDate: Date) => ['events', 'calendar-optimal', view, startDate, endDate] as const,
  
  // User data
  USER_ME: (userId: string) => ['user', 'me', userId] as const,
  
  // AI insights
  AI_INSIGHTS: (userId: string) => ['ai', 'insights', userId] as const,
  AI_SUMMARY: (userId: string, eventId: string) => ['ai', 'summary', userId, eventId] as const,
  
  // For infinite queries, we use a simpler pattern
  INFINITE_EVENTS: (queryType: string, pageSize: number, params: Record<string, any>) => 
    ['events', 'infinite', queryType, pageSize, params] as const,
} as const;

// Legacy support - map old queryKeys to new QUERY_KEYS
export const queryKeys = {
  all: QUERY_KEYS.EVENTS,
  
  userEvents: (userId: string) => QUERY_KEYS.USER_ME(userId),
  
  eventById: (eventId: string) => QUERY_KEYS.SINGLE_EVENT(eventId),
  
  calendarEvents: (_userId: string, month: number, year: number) => 
    QUERY_KEYS.CALENDAR_MONTH(month, year),
    
  calendarEventsForDateRange: (startDate: Date, endDate: Date) => 
    QUERY_KEYS.CALENDAR_RANGE(startDate, endDate),
    
  aiSummary: (userId: string, eventId: string) => 
    QUERY_KEYS.AI_SUMMARY(userId, eventId),
  
  // Simplified infinite query keys without stable hashing
  infiniteEvents: (eventType: string, params: Record<string, any>) => 
    QUERY_KEYS.INFINITE_EVENTS(eventType, params.pageSize || 10, params),
    
  infiniteUpcoming: (userId: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('upcoming', params.pageSize || 10, { userId, ...params }),
    
  infinitePast: (userId: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('past', params.pageSize || 10, { userId, ...params }),
    
  infiniteNearby: (lat: number, lng: number, distance: number, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('nearby', params.pageSize || 10, { lat, lng, distance, ...params }),
    
  infiniteFriends: (userId: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('friends', params.pageSize || 10, { userId, ...params }),
    
  infiniteRecommended: (userId: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('recommended', params.pageSize || 10, { userId, ...params }),
    
  infiniteSearch: (query: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('search', params.pageSize || 10, { query, ...params }),
    
  infiniteUser: (userId: string, targetUserId: string, params: Record<string, any> = {}) => 
    QUERY_KEYS.INFINITE_EVENTS('user', params.pageSize || 10, { userId, targetUserId, ...params }),
    
  userEventCount: (viewerId: string, targetUserId: string) => 
    ['user', 'eventCount', viewerId, targetUserId] as const,
  
  // Helper methods for cache invalidation
  invalidation: {
    allEventQueries: () => QUERY_KEYS.EVENTS,
    specificEventQueries: (eventId: string) => QUERY_KEYS.SINGLE_EVENT(eventId),
    allInfiniteQueries: () => ['events', 'infinite'] as const,
    infiniteQueriesByType: (eventType: string) => ['events', 'infinite', eventType] as const,
  },
} as const;