import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserEventsStore } from './useUserEventsStore';
import { useDiscoveryEventsStore } from './useDiscoveryEventsStore';
import { EVENT_TAGS, EventWithTags } from '@/utils/eventStore';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

// Upcoming Events Hook - uses UserEventsStore
export const useUpcomingEvents = (options?: { 
  limit?: number; 
  fromHomeScreen?: boolean;
}) => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  const { userId } = useAuthSession();
  
  const upcomingEvents = useMemo(() => {
    let events = allEvents.filter(event => event._tags?.has(EVENT_TAGS.UPCOMING));
    
    // Apply home screen limit
    if (options?.fromHomeScreen && options.limit) {
      events = events.slice(0, options.limit);
    }
    
    // Sort by start time
    events.sort((a, b) => 
      new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents, options?.limit, options?.fromHomeScreen]);
  
  return {
    ...query,
    data: upcomingEvents,
    events: upcomingEvents,
    totalCount: upcomingEvents.length,
  };
};

// Past Events Hook - uses UserEventsStore
export const usePastEvents = (options?: {
  year?: number;
  month?: number; // 0-11
  page?: number;
  limit?: number;
}) => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  
  const pastEvents = useMemo(() => {
    let events = allEvents.filter(event => event._tags?.has(EVENT_TAGS.PAST));
    
    // Apply date filters
    if (options?.year !== undefined || options?.month !== undefined) {
      events = events.filter(event => {
        if (!event.start_time) return false;
        const eventDate = new Date(event.start_time);
        
        if (options.year !== undefined && eventDate.getFullYear() !== options.year) {
          return false;
        }
        
        if (options.month !== undefined && eventDate.getMonth() !== options.month) {
          return false;
        }
        
        return true;
      });
    }
    
    // Sort by start time (most recent first)
    events.sort((a, b) => 
      new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
    );
    
    // Apply pagination
    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      events = events.slice(skip, skip + options.limit);
    }
    
    return events;
  }, [allEvents, options?.year, options?.month, options?.page, options?.limit]);
  
  return {
    ...query,
    data: pastEvents,
    events: pastEvents,
    totalCount: pastEvents.length,
    hasMore: options?.page && options?.limit 
      ? (options.page * options.limit) < pastEvents.length 
      : false,
    currentPage: options?.page || 1,
  };
};

// Friends Events Hook - uses DiscoveryEventsStore
export const useFriendsEvents = () => {
  const { data: allEvents = [], ...query } = useDiscoveryEventsStore();
  
  const friendsEvents = useMemo(() => {
    const events = allEvents.filter(event => 
      event._tags?.has(EVENT_TAGS.FRIENDS) && event.creator
    );
    
    // Sort by start time (newest first)
    events.sort((a, b) => 
      new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents]);
  
  return {
    ...query,
    data: friendsEvents,
    events: friendsEvents,
  };
};

// User Events Hook (for viewing other users' events)
export const useUserEvents = (targetUserId: string) => {
  const userStoreQuery = useUserEventsStore();
  const discoveryStoreQuery = useDiscoveryEventsStore();
  
  const allEvents = [...(userStoreQuery.data || []), ...(discoveryStoreQuery.data || [])];
  const query = { ...userStoreQuery, isLoading: userStoreQuery.isLoading || discoveryStoreQuery.isLoading };
  
  const userEvents = useMemo(() => {
    const events = allEvents.filter((event: EventWithTags) => 
      event._tags?.has(EVENT_TAGS.USER(targetUserId)) ||
      event._tags?.has(EVENT_TAGS.CREATED_BY_USER(targetUserId))
    );
    
    // Sort by start time (most recent first)
    events.sort((a: EventWithTags, b: EventWithTags) => 
      new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents, targetUserId]);
  
  return {
    ...query,
    data: userEvents,
    events: userEvents,
  };
};

// Single Event Hook (with fallback to API)
export const useEvent = (eventId: string) => {
  const userStoreQuery = useUserEventsStore();
  const discoveryStoreQuery = useDiscoveryEventsStore();
  
  const allEvents = [...(userStoreQuery.data || []), ...(discoveryStoreQuery.data || [])];
  
  // Check if event exists in store
  const cachedEvent = useMemo(() => 
    allEvents.find((e: EventWithTags) => e._id === eventId), 
    [allEvents, eventId]
  );
  
  // Fallback query if not in store
  return useQuery({
    queryKey: ['events', 'single', eventId],
    queryFn: async () => {
      const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
      // Handle both events array and single event response format
      if (response.data.events && Array.isArray(response.data.events) && response.data.events.length > 0) {
        return response.data.events[0];
      }
      if (response.data.event) {
        return response.data.event;
      }
      // Ensure we never return undefined - throw error if no event found
      throw new Error(`Event with ID ${eventId} not found`);
    },
    enabled: !cachedEvent && !!eventId,
    ...(cachedEvent && { initialData: cachedEvent }),
    // Cache-first configuration
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    networkMode: 'offlineFirst',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Nearby Events Hook (separate query due to location dependency)
export const useNearbyEvents = (
  latitude?: number, 
  longitude?: number, 
  distance: number = 50,
  options?: { 
    previewMode?: boolean; 
    previewLimit?: number;
    limit?: number;
    skip?: number;
  }
) => {
  return useQuery({
    queryKey: ['events', 'nearby', latitude, longitude, distance, options?.limit, options?.skip],
    queryFn: async () => {
      if (!latitude || !longitude) return { events: [], totalCount: 0 };
      
      const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
        params: { 
          lat: latitude, 
          lng: longitude, 
          distance,
          limit: options?.limit,
          skip: options?.skip,
        }
      });
      
      // Handle both events array and paginated response format
      let events = [];
      if (response.data.events && Array.isArray(response.data.events)) {
        events = response.data.events;
      } else if (Array.isArray(response.data)) {
        events = response.data;
      }
      
      // Apply preview limit if needed
      if (options?.previewMode && options.previewLimit) {
        events = events.slice(0, options.previewLimit);
      }
      
      return { 
        events, 
        totalCount: response.data.totalCount || events.length,
        hasMore: response.data.hasMore || false,
      };
    },
    enabled: !!latitude && !!longitude,
    // Cache-first configuration
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    networkMode: 'offlineFirst',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Attention Required Events Hook
export const useAttentionRequiredEvents = (options?: { 
  fromHomeScreen?: boolean;
  limit?: number;
}) => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  
  const attentionEvents = useMemo(() => {
    let events = allEvents.filter(event => 
      event._tags?.has(EVENT_TAGS.ATTENTION_REQUIRED) ||
      event._metadata?.userStatus === 'pending'
    );
    
    // Apply home screen limit
    if (options?.fromHomeScreen && options.limit) {
      events = events.slice(0, options.limit);
    }
    
    return events;
  }, [allEvents, options?.fromHomeScreen, options?.limit]);
  
  return {
    ...query,
    data: attentionEvents,
    events: attentionEvents,
  };
};

// Recommended Events Hook - uses DiscoveryEventsStore
export const useRecommendedEvents = (options?: {
  page?: number;
  limit?: number;
}) => {
  const { data: allEvents = [], ...query } = useDiscoveryEventsStore();
  
  const recommendedEvents = useMemo(() => {
    let events = allEvents.filter((event: EventWithTags) => 
      event._tags?.has(EVENT_TAGS.RECOMMENDED)
    );
    
    // Apply pagination
    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      events = events.slice(skip, skip + options.limit);
    }
    
    return events;
  }, [allEvents, options?.page, options?.limit]);
  
  return {
    ...query,
    data: recommendedEvents,
    events: recommendedEvents,
    totalCount: recommendedEvents.length,
    hasMore: options?.page && options?.limit 
      ? (options.page * options.limit) < recommendedEvents.length 
      : false,
  };
};

// Joined Events Hook (events user is participating in)
export const useJoinedEvents = () => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  const { userId } = useAuthSession();
  
  const joinedEvents = useMemo(() => {
    const events = allEvents.filter(event => 
      event._tags?.has(EVENT_TAGS.PARTICIPATING(userId || ''))
    );
    
    events.sort((a, b) => 
      new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents, userId]);
  
  return {
    ...query,
    data: joinedEvents,
    events: joinedEvents,
  };
};

// Created Events Hook (events created by user)
export const useCreatedEvents = () => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  const { userId } = useAuthSession();
  
  const createdEvents = useMemo(() => {
    const events = allEvents.filter(event => 
      event._tags?.has(EVENT_TAGS.CREATED_BY_USER(userId || ''))
    );
    
    events.sort((a, b) => 
      new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents, userId]);
  
  return {
    ...query,
    data: createdEvents,
    events: createdEvents,
  };
};

// Invited Events Hook (events user is invited to but hasn't responded)
export const useInvitedEvents = () => {
  const { data: allEvents = [], ...query } = useUserEventsStore();
  
  const invitedEvents = useMemo(() => {
    const events = allEvents.filter(event => 
      event._tags?.has(EVENT_TAGS.ATTENTION_REQUIRED) &&
      event._metadata?.userStatus === 'pending'
    );
    
    events.sort((a, b) => 
      new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
    );
    
    return events;
  }, [allEvents]);
  
  return {
    ...query,
    data: invitedEvents,
    events: invitedEvents,
  };
};

// Category Events Hook
export const useCategoryEvents = (category?: string) => {
  const userStoreQuery = useUserEventsStore();
  const discoveryStoreQuery = useDiscoveryEventsStore();
  
  const allEvents = [...(userStoreQuery.data || []), ...(discoveryStoreQuery.data || [])];
  const query = { ...userStoreQuery, isLoading: userStoreQuery.isLoading || discoveryStoreQuery.isLoading };
  
  const categoryEvents = useMemo(() => {
    if (!category) return [];
    
    const now = new Date();
    const events = allEvents
      .filter(event => 
        event._tags?.has(EVENT_TAGS.CATEGORY(category)) &&
        event._tags?.has(EVENT_TAGS.UPCOMING) // Only upcoming events
      )
      .filter(event => {
        // Filter out past events
        if (!event.start_time) return false;
        return new Date(event.start_time) > now;
      });
    
    // Handle recurring events - keep only the next upcoming occurrence
    const eventMap = new Map<string, EventWithTags>();
    
    events.forEach(event => {
      if (event.recurrence?.checked) {
        // This is a recurring event
        const baseId = event._id?.split('-')[0] || event._id;
        
        if (baseId) {
          const existing = eventMap.get(baseId);
          if (!existing || 
              (event.start_time && existing.start_time && 
               new Date(event.start_time) < new Date(existing.start_time))) {
            // Keep the earliest upcoming occurrence
            eventMap.set(baseId, event);
          }
        }
      } else {
        // Non-recurring event
        if (event._id) {
          eventMap.set(event._id, event);
        }
      }
    });
    
    const uniqueEvents = Array.from(eventMap.values());
    
    // Sort by start time (earliest first)
    uniqueEvents.sort((a, b) => 
      new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
    );
    
    return uniqueEvents;
  }, [allEvents, category]);
  
  return {
    ...query,
    data: categoryEvents,
    events: categoryEvents,
  };
};

// City Events Hook
export const useCityEvents = (city?: string) => {
  const userStoreQuery = useUserEventsStore();
  const discoveryStoreQuery = useDiscoveryEventsStore();
  
  const allEvents = [...(userStoreQuery.data || []), ...(discoveryStoreQuery.data || [])];
  const query = { ...userStoreQuery, isLoading: userStoreQuery.isLoading || discoveryStoreQuery.isLoading };
  
  const cityEvents = useMemo(() => {
    if (!city) return [];
    
    const now = new Date();
    const events = allEvents
      .filter(event => 
        event._tags?.has(EVENT_TAGS.CITY(city)) &&
        event._tags?.has(EVENT_TAGS.UPCOMING) // Only upcoming events
      )
      .filter(event => {
        // Filter out past events
        if (!event.start_time) return false;
        return new Date(event.start_time) > now;
      });
    
    // Handle recurring events - keep only the next upcoming occurrence
    const eventMap = new Map<string, EventWithTags>();
    
    events.forEach(event => {
      if (event.recurrence?.checked) {
        // This is a recurring event
        const baseId = event._id?.split('-')[0] || event._id;
        
        if (baseId) {
          const existing = eventMap.get(baseId);
          if (!existing || 
              (event.start_time && existing.start_time && 
               new Date(event.start_time) < new Date(existing.start_time))) {
            // Keep the earliest upcoming occurrence
            eventMap.set(baseId, event);
          }
        }
      } else {
        // Non-recurring event
        if (event._id) {
          eventMap.set(event._id, event);
        }
      }
    });
    
    const uniqueEvents = Array.from(eventMap.values());
    
    // Sort by start time (earliest first)
    uniqueEvents.sort((a, b) => 
      new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
    );
    
    return uniqueEvents;
  }, [allEvents, city]);
  
  return {
    ...query,
    data: cityEvents,
    events: cityEvents,
  };
};