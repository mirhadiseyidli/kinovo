import { queryClient } from './queryClient';
import { QUERY_KEYS, EventWithTags, EVENT_TAGS, getTagsForEvent } from './eventStore';
import { Event } from '@/types/allTypes';

// Core cache operations
export const getAllEvents = (): EventWithTags[] => {
  return queryClient.getQueryData(QUERY_KEYS.EVENTS) || [];
};

export const getEventsByTag = (tag: string): EventWithTags[] => {
  const allEvents = getAllEvents();
  return allEvents.filter(event => event._tags?.has(tag));
};

export const addEventToCache = (newEvent: Event, userId?: string) => {
  queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldEvents: EventWithTags[] = []) => {
    // Deduplicate by ID first to ensure no duplicates exist
    const uniqueEvents = new Map<string, EventWithTags>();
    oldEvents.forEach(event => {
      if (event._id) {
        uniqueEvents.set(event._id, event);
      }
    });
    
    // Check if event already exists
    const existingEvent = uniqueEvents.get(newEvent._id);
    
    if (existingEvent) {
      // Update existing event
      uniqueEvents.set(newEvent._id, {
        ...newEvent,
        _tags: existingEvent._tags, // Preserve existing tags
        _metadata: {
          addedAt: existingEvent._metadata?.addedAt || new Date(),
          source: existingEvent._metadata?.source || 'upcoming',
          ...existingEvent._metadata,
          lastUpdated: new Date(),
        }
      });
    } else {
      // Add new event with appropriate tags
      const eventTags = getTagsForEvent(newEvent, userId);
      
      const newEventWithTags: EventWithTags = {
        ...newEvent,
        _tags: new Set(eventTags),
        _metadata: {
          addedAt: new Date(),
          lastUpdated: new Date(),
          source: 'upcoming', // Default source
          userStatus: newEvent.userStatus,
        },
      };
      uniqueEvents.set(newEvent._id, newEventWithTags);
    }
    
    // Return array of unique events
    return Array.from(uniqueEvents.values());
  });
  
  // Also update individual event cache
  queryClient.setQueryData(['events', 'single', newEvent._id], newEvent);
  
  // Add to infinite query caches for upcoming events
  addToInfiniteQueryCaches(newEvent, userId);
  
  // Invalidate specific queries to trigger re-renders
  queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] });
  queryClient.invalidateQueries({ queryKey: ['events', 'infinite'] });
  // CRITICAL: Invalidate the main events store that CalendarProvider uses
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS });
};

export const updateEventInCache = (updatedEvent: Event, userId?: string) => {
  // Track if this is a new event being added
  let isNewEvent = false;
  
  // Update the main events store cache
  queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldEvents: EventWithTags[] = []) => {
    // First deduplicate to ensure no duplicates exist
    const uniqueEvents = new Map<string, EventWithTags>();
    oldEvents.forEach(event => {
      if (event._id) {
        // If we find duplicates, keep the first one
        if (!uniqueEvents.has(event._id)) {
          uniqueEvents.set(event._id, event);
        }
      }
    });
    
    // Now update the target event if it exists
    if (uniqueEvents.has(updatedEvent._id)) {
      const existingEvent = uniqueEvents.get(updatedEvent._id)!;
      
      // Recalculate tags based on the updated event data
      const newTags = new Set(getTagsForEvent(updatedEvent, userId, existingEvent._metadata?.source));
      
      // Update user status in metadata based on attendee status
      let userStatus = existingEvent._metadata?.userStatus;
      if (userId) {
        const userAttendee = updatedEvent.attendees?.find(attendee => {
          if (typeof attendee.user === 'string') {
            return attendee.user === userId;
          } else if (typeof attendee.user === 'object' && attendee.user?._id) {
            return attendee.user._id === userId;
          }
          return false;
        });
        userStatus = userAttendee?.status || null;
      }
      
      uniqueEvents.set(updatedEvent._id, {
        ...updatedEvent,
        _tags: newTags, // Recalculated tags
        _metadata: {
          addedAt: existingEvent._metadata?.addedAt || new Date(),
          source: existingEvent._metadata?.source || 'upcoming',
          ...existingEvent._metadata,
          lastUpdated: new Date(),
          userStatus, // Updated user status
        }
      });
    } else {
      // If event doesn't exist, add it as new
      console.warn(`Event ${updatedEvent._id} not found in cache, adding as new`);
      isNewEvent = true;
      const newEventWithTags: EventWithTags = {
        ...updatedEvent,
        _tags: new Set(getTagsForEvent(updatedEvent, userId)),
        _metadata: {
          addedAt: new Date(),
          lastUpdated: new Date(),
          source: 'upcoming',
          userStatus: updatedEvent.userStatus,
        },
      };
      uniqueEvents.set(updatedEvent._id, newEventWithTags);
    }
    
    // Return deduplicated array
    return Array.from(uniqueEvents.values());
  });
  
  // Update individual event cache
  queryClient.setQueryData(['events', 'single', updatedEvent._id], updatedEvent);
  
  // For new events, add to infinite query caches; for existing events, update them
  if (isNewEvent) {
    addToInfiniteQueryCaches(updatedEvent, userId);
  } else {
    updateInfiniteQueryCaches(updatedEvent);
  }
  
  // IMPORTANT: Invalidate specific query patterns to trigger re-renders
  queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] });
  queryClient.invalidateQueries({ queryKey: ['events', 'attention'] });
  queryClient.invalidateQueries({ queryKey: ['events', 'infinite'] });
  // CRITICAL: Invalidate the main events store that CalendarProvider uses
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS });
};

export const removeEventFromCache = (eventId: string) => {
  queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldEvents: EventWithTags[] = []) => 
    oldEvents.filter(event => event._id !== eventId)
  );
  
  // Remove from individual event cache
  queryClient.removeQueries({ queryKey: ['events', 'single', eventId] });
  
  // Remove from infinite query caches
  removeFromInfiniteQueryCaches(eventId);
  
  // Invalidate specific queries to trigger re-renders
  queryClient.invalidateQueries({ queryKey: ['events', 'upcoming'] });
  queryClient.invalidateQueries({ queryKey: ['events', 'attention'] });
  queryClient.invalidateQueries({ queryKey: ['events', 'infinite'] });
  // CRITICAL: Invalidate the main events store that CalendarProvider uses
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EVENTS });
};

// Add new event to infinite query caches
const addToInfiniteQueryCaches = (newEvent: Event, userId?: string) => {
  const now = new Date();
  const eventDate = new Date(newEvent.start_time || new Date());
  
  // Add to upcoming infinite queries if it's an upcoming event
  if (eventDate > now) {
    queryClient.setQueriesData(
      { queryKey: ['events', 'infinite', 'upcoming'], exact: false },
      (oldData: any) => {
        
        if (!oldData?.pages) return oldData;
        
        // Add the new event to the first page
        const newPages = [...oldData.pages];
        if (newPages[0]) {
          // Check if event already exists
          const exists = newPages[0].events.some((e: Event) => e._id === newEvent._id);
          if (!exists) {
            newPages[0] = {
              ...newPages[0],
              events: [newEvent, ...newPages[0].events],
              totalCount: (newPages[0].totalCount || 0) + 1
            };
          }
        }
        
        return {
          ...oldData,
          pages: newPages
        };
      }
    );
  }
  
  // Add to user's events if they created it
  if (userId && newEvent.creator?._id === userId) {
    queryClient.setQueriesData(
      { queryKey: ['events', 'infinite', 'user'], exact: false },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        const newPages = [...oldData.pages];
        if (newPages[0]) {
          const exists = newPages[0].events.some((e: Event) => e._id === newEvent._id);
          if (!exists) {
            newPages[0] = {
              ...newPages[0],
              events: [newEvent, ...newPages[0].events],
              totalCount: (newPages[0].totalCount || 0) + 1
            };
          }
        }
        
        return {
          ...oldData,
          pages: newPages
        };
      }
    );
  }
};

// Update infinite query caches
const updateInfiniteQueryCaches = (updatedEvent: Event) => {
  const infiniteQueryTypes = [
    'upcoming', 'past', 'nearby', 'friends', 'search', 'user', 'recommended'
  ];
  
  infiniteQueryTypes.forEach(queryType => {
    queryClient.setQueriesData(
      { queryKey: ['events', 'infinite', queryType], exact: false },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            events: page.events.map((event: Event) =>
              event._id === updatedEvent._id ? updatedEvent : event
            )
          }))
        };
      }
    );
  });
};

const removeFromInfiniteQueryCaches = (eventId: string) => {
  const infiniteQueryTypes = [
    'upcoming', 'past', 'nearby', 'friends', 'search', 'user', 'recommended'
  ];
  
  infiniteQueryTypes.forEach(queryType => {
    queryClient.setQueriesData(
      { queryKey: ['events', 'infinite', queryType], exact: false },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            events: page.events.filter((event: Event) => event._id !== eventId),
            totalCount: Math.max(0, (page.totalCount || 0) - 1)
          }))
        };
      }
    );
  });
};

// Batch operations for efficiency
type BatchOperation = 'add' | 'update' | 'remove';

export const batchUpdateEvents = (
  events: Event[] | Array<{ _id: string }>, 
  operation: BatchOperation,
  userId?: string
) => {
  if (operation === 'remove') {
    // For remove operations, events should be array of { _id: string }
    const eventIds = events.map(e => e._id);
    queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldEvents: EventWithTags[] = []) => 
      oldEvents.filter(event => !eventIds.includes(event._id))
    );
    
    // Remove from individual caches
    eventIds.forEach(eventId => {
      queryClient.removeQueries({ queryKey: ['events', 'single', eventId] });
    });
    
    return;
  }
  
  queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldEvents: EventWithTags[] = []) => {
    // Use Map to ensure uniqueness by ID
    const eventMap = new Map<string, EventWithTags>();
    
    // First add all existing events (deduplicating if needed)
    oldEvents.forEach(event => {
      if (event._id && !eventMap.has(event._id)) {
        eventMap.set(event._id, event);
      }
    });
    
    (events as Event[]).forEach(eventData => {
      const existingEvent = eventMap.get(eventData._id);
      
      if (operation === 'add') {
        if (!existingEvent) {
          // Add new event
          const newEventWithTags: EventWithTags = {
            ...eventData,
            _tags: new Set(getTagsForEvent(eventData, userId)),
            _metadata: {
              addedAt: new Date(),
              lastUpdated: new Date(),
              source: 'upcoming',
              userStatus: eventData.userStatus,
            },
          };
          eventMap.set(eventData._id, newEventWithTags);
        } else {
          // Update if trying to add existing event
          const newTags = new Set(getTagsForEvent(eventData, userId, existingEvent._metadata?.source));
          eventMap.set(eventData._id, {
            ...eventData,
            _tags: newTags,
            _metadata: {
              addedAt: existingEvent._metadata?.addedAt || new Date(),
              source: existingEvent._metadata?.source || 'upcoming',
              ...existingEvent._metadata,
              lastUpdated: new Date(),
              userStatus: eventData.userStatus,
            }
          });
        }
      } else if (operation === 'update') {
        if (existingEvent) {
          // Update existing event with recalculated tags
          const newTags = new Set(getTagsForEvent(eventData, userId, existingEvent._metadata?.source));
          eventMap.set(eventData._id, {
            ...eventData,
            _tags: newTags, // Recalculated tags
            _metadata: {
              addedAt: existingEvent._metadata?.addedAt || new Date(),
              lastUpdated: new Date(),
              source: existingEvent._metadata?.source || 'upcoming',
              userStatus: eventData.userStatus,
            }
          });
        } else {
          // Add as new if doesn't exist
          const newEventWithTags: EventWithTags = {
            ...eventData,
            _tags: new Set(getTagsForEvent(eventData, userId)),
            _metadata: {
              addedAt: new Date(),
              lastUpdated: new Date(),
              source: 'upcoming',
              userStatus: eventData.userStatus,
            },
          };
          eventMap.set(eventData._id, newEventWithTags);
        }
      }
    });
    
    return Array.from(eventMap.values());
  });
  
  // Update individual event caches for add/update operations
  if (operation === 'add' || operation === 'update') {
    (events as Event[]).forEach(event => {
      queryClient.setQueryData(['events', 'single', event._id], event);
    });
  }
};