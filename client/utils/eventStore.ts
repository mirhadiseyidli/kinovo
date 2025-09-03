import { Event } from '@/types/allTypes';

export interface EventWithTags extends Event {
  _tags?: Set<string>;
  _metadata?: {
    addedAt: Date;
    lastUpdated: Date;
    source: 'upcoming' | 'past' | 'nearby' | 'friends' | 'calendar' | 'search' | 'ai' | 'recommended';
    userStatus?: 'pending' | 'maybe' | 'accepted' | 'rejected' | null;
  };
}

export const EVENT_TAGS = {
  // Time-based
  UPCOMING: 'upcoming',
  PAST: 'past',
  
  // Location-based
  NEARBY: 'nearby',
  
  // Social
  FRIENDS: 'friends',
  
  // Views
  CALENDAR: 'calendar',
  SEARCH: 'search',
  
  // Status-based
  ATTENTION_REQUIRED: 'attention-required',
  AI_INSIGHTS: 'ai-insights',
  
  // User-specific
  USER: (userId: string) => `user:${userId}`,
  CREATED_BY_USER: (userId: string) => `creator:${userId}`,
  PARTICIPATING: (userId: string) => `participating:${userId}`,
  
  // Category-based
  CATEGORY: (category: string) => `category:${category}`,
  CITY: (city: string) => `city:${city}`,
  
  // Special states
  RECOMMENDED: 'recommended',
  TRENDING: 'trending',
} as const;

export const QUERY_KEYS = {
  EVENTS: ['events', 'store'] as const, // Deprecated - will be removed
  USER_EVENTS: ['user-events', 'store'] as const, // Events where user is attendee
  DISCOVERY_EVENTS: ['discovery-events', 'store'] as const, // Friends & recommended events
  USER_DATA: ['user', 'data'] as const,
  USER_PRESENCE: ['user', 'presence'] as const,
  EVENT_OCCURRENCES: ['events', 'occurrences'] as const,
  AI_INSIGHTS: ['ai', 'insights'] as const,
  ATTENTION_REQUIRED: ['events', 'attention'] as const,
} as const;

// Determine tags for an event
export const getTagsForEvent = (event: Event, userId?: string, source?: string): string[] => {
  const tags: string[] = [];
  const now = new Date();
  const eventDate = new Date(event.start_time || new Date());
  
  // Time-based tags
  if (eventDate > now) {
    tags.push(EVENT_TAGS.UPCOMING);
  } else {
    tags.push(EVENT_TAGS.PAST);
  }
  
  // Always include calendar
  tags.push(EVENT_TAGS.CALENDAR);
  
  // User-specific tags and status-based tags
  if (userId) {
    if (event.creator?._id === userId) {
      tags.push(EVENT_TAGS.CREATED_BY_USER(userId));
    }
    
    // Find user's attendee status
    const userAttendee = event.attendees?.find(attendee => {
      // Handle both User object and string ID cases
      if (typeof attendee.user === 'string') {
        return attendee.user === userId;
      } else if (typeof attendee.user === 'object' && attendee.user?._id) {
        return attendee.user._id === userId;
      }
      return false;
    });
    
    if (userAttendee) {
      const status = userAttendee.status;
      
      // Tag based on user's response status
      if (status === 'pending') {
        tags.push(EVENT_TAGS.ATTENTION_REQUIRED);
      } else if (status === 'accepted' || status === 'maybe') {
        tags.push(EVENT_TAGS.PARTICIPATING(userId));
      }
      // Note: 'declined' doesn't get any special tags - they don't see it in upcoming or participating
    }
  }
  
  // Category tag
  if (event.category) {
    tags.push(EVENT_TAGS.CATEGORY(event.category));
  }
  
  // Location tags
  if (event.location?.city) {
    tags.push(EVENT_TAGS.CITY(event.location.city));
  }
  
  if (event.location?.coordinates?.lat) {
    tags.push(EVENT_TAGS.NEARBY);
  }
  
  // Source-based tags
  if (source) {
    switch (source) {
      case 'friends':
        tags.push(EVENT_TAGS.FRIENDS);
        break;
      case 'recommended':
        tags.push(EVENT_TAGS.RECOMMENDED);
        break;
      case 'ai':
        tags.push(EVENT_TAGS.AI_INSIGHTS);
        break;
    }
  }
  
  return tags;
};