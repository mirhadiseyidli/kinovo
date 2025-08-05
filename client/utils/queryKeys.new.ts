// New simplified query keys based on new_tanstack.md
export const queryKeys = {
  // Base key for all event queries
  all: ['events'] as const,
  
  // Individual event queries
  eventById: (eventId: string) => [...queryKeys.all, 'detail', eventId] as const,
  
  // User-specific event lists
  myEvents: (userId: string) => [...queryKeys.all, 'user', userId] as const,
  upcomingEvents: (userId: string, homeScreen?: boolean) => 
    [...queryKeys.myEvents(userId), 'upcoming', { homeScreen: homeScreen || false }] as const,
  pastEvents: (userId: string, filters?: { year?: number; month?: number; page?: number; limit?: number }) => 
    [...queryKeys.myEvents(userId), 'past', filters || {}] as const,
  attentionRequired: (userId: string, homeScreen?: boolean) => 
    [...queryKeys.myEvents(userId), 'attention', { homeScreen: homeScreen || false }] as const,
  
  // Discovery queries
  nearbyEvents: (lat: number, lng: number, distance: number) => 
    [...queryKeys.all, 'nearby', { lat, lng, distance }] as const,
  recommendedEvents: (userId: string) => 
    [...queryKeys.all, 'recommended', userId] as const,
  friendsEvents: (userId: string) => 
    [...queryKeys.all, 'friends', userId] as const,
  
  // Calendar queries
  calendarEvents: (userId: string, month: number, year: number) => 
    [...queryKeys.myEvents(userId), 'calendar', { month, year }] as const,
  calendarRange: (userId: string, startDate: string, endDate: string) => 
    [...queryKeys.myEvents(userId), 'range', { startDate, endDate }] as const,
  calendarOccurrences: (startDate: Date, endDate: Date) => 
    [...queryKeys.all, 'occurrences', { startDate: startDate.toISOString(), endDate: endDate.toISOString() }] as const,
  
  // Search queries
  searchEvents: (query: string) => 
    [...queryKeys.all, 'search', query] as const,
  
  // Infinite queries
  infiniteEvents: (type: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', type, params] as const,
  infiniteUpcoming: (userId: string, params: Record<string, any>) => 
    [...queryKeys.myEvents(userId), 'infinite', 'upcoming', params] as const,
  infinitePast: (userId: string, params: Record<string, any>) => 
    [...queryKeys.myEvents(userId), 'infinite', 'past', params] as const,
  infiniteNearby: (lat: number, lng: number, distance: number, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', 'nearby', { lat, lng, distance, ...params }] as const,
  infiniteFriends: (userId: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', 'friends', userId, params] as const,
  infiniteRecommended: (userId: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', 'recommended', userId, params] as const,
  infiniteSearch: (searchQuery: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', 'search', searchQuery, params] as const,
  infiniteUser: (viewerId: string, profileUserId: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', 'user', viewerId, profileUserId, params] as const,
  
  // Profile queries
  userPublicEvents: (viewerId: string, profileUserId: string) => 
    [...queryKeys.all, 'profile', viewerId, profileUserId] as const,
  userEventCount: (viewerId: string, profileUserId: string) => 
    [...queryKeys.all, 'count', viewerId, profileUserId] as const,
};

// User query keys
export const userQueryKeys = {
  all: ['users'] as const,
  currentUser: () => [...userQueryKeys.all, 'current'] as const,
  userProfile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  friends: () => [...userQueryKeys.all, 'friends'] as const,
  favoriteActivities: () => [...userQueryKeys.all, 'activities'] as const,
};

// Notification query keys
export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
  friendRequests: () => [...notificationQueryKeys.all, 'friend-requests'] as const,
};