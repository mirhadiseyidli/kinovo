import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, EventWithTags, getTagsForEvent } from '@/utils/eventStore';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

/**
 * User Events Store - Contains only events where the user is an attendee
 * This store is used for:
 * - Calendar views (Month, Week, Schedule)
 * - My Events lists
 * - User's personal event management
 * 
 * Does NOT include:
 * - Friends' events (unless user is invited)
 * - Recommended events (unless user has joined)
 * - Nearby events (unless user has joined)
 */
export const useUserEventsStore = () => {
  const { userId } = useAuthSession();
  
  const query = useQuery({
    queryKey: QUERY_KEYS.USER_EVENTS,
    queryFn: async () => {
      if (!userId) return [];
      
      // Fetch only user's own events (where they are attendees)
      const [upcoming, past, attentionRequired] = await Promise.all([
        api.get('/api/manageevents/eventslist/get/my/upcoming/events'),
        api.get('/api/manageevents/eventslist/get/my/past/events'),
        api.get('/api/manageevents/eventslist/get/attention/required'),
      ]);
      
      const eventSources = [
        { events: upcoming.data.events || [], source: 'upcoming' as const },
        { events: past.data.events || [], source: 'past' as const },
        { events: attentionRequired.data.events || [], source: 'upcoming' as const }, // attention required are upcoming events
      ];
      
      // Deduplicate and tag events
      const eventMap = new Map<string, EventWithTags>();
      
      eventSources.forEach(({ events, source }) => {
        events.forEach((event: Event) => {
          const existingEvent = eventMap.get(event._id!);
          const tags = getTagsForEvent(event, userId, source);
          
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
                userStatus: event.userStatus,
              },
            });
          }
        });
      });
      
      return Array.from(eventMap.values());
    },
    // Cache configuration optimized for calendar usage
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for 30 min after unused
    refetchOnWindowFocus: true, // Refresh when user focuses window/app
    refetchOnMount: true, // Cache-first: serve cache immediately, then refetch in background
    refetchInterval: 10 * 60 * 1000, // Background refresh every 10 minutes
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
 * Fetch user events for a specific date range
 * Used by calendar views to get events within visible date range
 */
export const useUserEventsForDateRange = (startDate: Date, endDate: Date) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['user-events', 'date-range', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
        params: { 
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      });
      
      const events: Event[] = response.data.events || [];
      
      // Tag events appropriately
      return events.map(event => ({
        ...event,
        _tags: new Set(getTagsForEvent(event, userId, 'calendar')),
        _metadata: {
          addedAt: new Date(),
          lastUpdated: new Date(),
          source: 'calendar' as const,
          userStatus: event.userStatus,
        },
      })) as EventWithTags[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!userId,
  });
};