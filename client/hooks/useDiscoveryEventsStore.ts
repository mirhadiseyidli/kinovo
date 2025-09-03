import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, EventWithTags, getTagsForEvent } from '@/utils/eventStore';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

/**
 * Discovery Events Store - Contains events for discovery and social features
 * This store is used for:
 * - Explore/Discover screens
 * - Friends' events feed
 * - Recommended events
 * - Nearby events (if location available)
 * 
 * Does NOT include:
 * - Events where user is already an attendee (those are in UserEventsStore)
 * 
 * When a user joins an event from discovery:
 * - Event should be removed from this store
 * - Event should be added to UserEventsStore
 */
export const useDiscoveryEventsStore = (options?: {
  includeNearby?: boolean;
  latitude?: number;
  longitude?: number;
  radius?: number;
}) => {
  const { userId } = useAuthSession();
  
  const query = useQuery({
    queryKey: options?.includeNearby 
      ? [...QUERY_KEYS.DISCOVERY_EVENTS, 'nearby', options.latitude, options.longitude, options.radius]
      : QUERY_KEYS.DISCOVERY_EVENTS,
    queryFn: async () => {
      if (!userId) return [];
      
      // Prepare API calls
      const apiCalls = [
        api.get('/api/manageevents/eventslist/friends'),
        api.get('/api/manageevents/eventslist/get/recommended'),
      ];
      
      // Add nearby events if location is provided
      if (options?.includeNearby && options.latitude && options.longitude) {
        apiCalls.push(
          api.get('/api/manageevents/eventslist/get/nearby/events', {
            params: { 
              latitude: options.latitude,
              longitude: options.longitude,
              radius: options.radius || 10,
            }
          })
        );
      }
      
      // Fetch discovery/social events
      const responses = await Promise.all(apiCalls);
      
      const eventSources: Array<{ events: Event[], source: 'friends' | 'recommended' | 'nearby' }> = [
        { events: responses[0].data.events || [], source: 'friends' as const },
        { events: responses[1].data.events || [], source: 'recommended' as const },
      ];
      
      // Add nearby events if they were fetched
      if (responses[2]) {
        eventSources.push({ events: responses[2].data.events || [], source: 'nearby' as const });
      }
      
      // Deduplicate and tag events
      const eventMap = new Map<string, EventWithTags>();
      
      eventSources.forEach(({ events, source }) => {
        events.forEach((event: Event) => {
          // Skip events where user is already an attendee
          // These should be in UserEventsStore instead
          const isUserAttendee = event.attendees?.some(
            attendee => {
              const attendeeId = typeof attendee.user === 'string' 
                ? attendee.user 
                : attendee.user?._id;
              return attendeeId === userId;
            }
          );
          
          if (isUserAttendee) {
            // Skip - this event belongs in UserEventsStore
            return;
          }
          
          const existingEvent = eventMap.get(event._id!);
          const tags = getTagsForEvent(event, userId, source);
          
          // Add source-specific tags
          if (source === 'friends') {
            tags.push('friends');
          } else if (source === 'recommended') {
            tags.push('recommended');
          }
          
          if (existingEvent) {
            // Merge tags for duplicate events
            tags.forEach(tag => existingEvent._tags?.add(tag));
          } else {
            eventMap.set(event._id!, {
              ...event,
              _tags: new Set(tags),
              _metadata: {
                addedAt: new Date(),
                lastUpdated: new Date(),
                source,
                userStatus: null, // User is not an attendee
              },
            });
          }
        });
      });
      
      return Array.from(eventMap.values());
    },
    // Cache configuration optimized for discovery features
    staleTime: 1 * 60 * 1000, // 1 minute - discovery content updates more frequently
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache for 15 min after unused
    refetchOnWindowFocus: true, // Refresh when user focuses window/app
    refetchOnMount: true, // Cache-first: serve cache immediately, then refetch in background
    refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
    refetchIntervalInBackground: false, // Don't refetch when app is in background
    networkMode: 'offlineFirst', // Show cache first, then update from network
    enabled: !!userId,
    // Retry configuration
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  
  return query;
};

/**
 * Fetch nearby events (if location is available)
 */
export const useNearbyEvents = (latitude?: number, longitude?: number, radius?: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['discovery-events', 'nearby', latitude, longitude, radius],
    queryFn: async () => {
      if (!userId || !latitude || !longitude) return [];
      
      const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
        params: { 
          latitude,
          longitude,
          radius: radius || 10, // Default 10km radius
        }
      });
      
      const events: Event[] = response.data.events || [];
      
      // Filter out events where user is already an attendee
      const discoveryEvents = events.filter(event => {
        const isUserAttendee = event.attendees?.some(
          attendee => {
            const attendeeId = typeof attendee.user === 'string' 
              ? attendee.user 
              : attendee.user?._id;
            return attendeeId === userId;
          }
        );
        return !isUserAttendee;
      });
      
      // Tag events appropriately
      return discoveryEvents.map(event => ({
        ...event,
        _tags: new Set([...getTagsForEvent(event, userId, 'nearby'), 'nearby']),
        _metadata: {
          addedAt: new Date(),
          lastUpdated: new Date(),
          source: 'nearby' as const,
          userStatus: null,
        },
      })) as EventWithTags[];
    },
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId && !!latitude && !!longitude,
  });
};