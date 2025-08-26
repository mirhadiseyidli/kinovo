import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, EventWithTags, getTagsForEvent } from '@/utils/eventStore';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

export const useEventsStore = () => {
  const { userId } = useAuthSession();
  
  const query = useQuery({
    queryKey: QUERY_KEYS.EVENTS,
    queryFn: async () => {
      if (!userId) return [];
      
      // Fetch all user-relevant events in parallel
      const [upcoming, past, friends, recommended] = await Promise.all([
        api.get('/api/manageevents/eventslist/get/my/upcoming/events'),
        api.get('/api/manageevents/eventslist/get/my/past/events'),
        api.get('/api/manageevents/eventslist/friends'),
        api.get('/api/manageevents/eventslist/get/recommended'),
      ]);
      
      const eventSources = [
        { events: upcoming.data.events || [], source: 'upcoming' as const },
        { events: past.data.events || [], source: 'past' as const },
        { events: friends.data.events || [], source: 'friends' as const },
        { events: recommended.data.events || [], source: 'recommended' as const },
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
    // Cache-first with background refresh configuration
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