import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, EventWithTags, getTagsForEvent } from '@/utils/eventStore';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

export const useCalendarCacheManager = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  const updateCacheWithRangeEvents = useCallback(async (startDate: Date, endDate: Date) => {
    if (!userId) return;

    try {
      // Get current cache data FIRST - implement cache-first strategy
      const currentData = queryClient.getQueryData<EventWithTags[]>(QUERY_KEYS.EVENTS) || [];
      
      // If we have cached data, use it immediately and fetch in background
      // This prevents the calendar from showing empty state on mount/refresh

      // Fetch events for the date range (in background if cache exists)
      const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
        params: { 
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        }
      });

      const rangeEvents: Event[] = response.data.events || [];
      
      // Always merge with existing cache, even if no new range events
      // This ensures cache consistency and prevents overwrites
      
      // Create a map of existing events for efficient lookup
      const existingEventsMap = new Map(
        currentData.map(event => [event._id!, event])
      );

      // Process range events and merge with existing cache
      const updatedEvents: EventWithTags[] = [];
      const seenIds = new Set<string>();

      // Add/update events from range (if any)
      rangeEvents.forEach((event: Event) => {
        if (!event._id || seenIds.has(event._id)) return;
        seenIds.add(event._id);

        const existingEvent = existingEventsMap.get(event._id);
        const tags = getTagsForEvent(event, userId, 'calendar');
        
        const eventWithTags: EventWithTags = {
          ...event,
          _tags: new Set([
            ...(existingEvent?._tags ? Array.from(existingEvent._tags) : []),
            ...tags,
            'calendar' // Always tag as calendar event
          ]),
          _metadata: {
            addedAt: existingEvent?._metadata?.addedAt || new Date(),
            lastUpdated: new Date(),
            source: existingEvent?._metadata?.source || 'calendar',
            userStatus: event.userStatus,
          },
        };

        updatedEvents.push(eventWithTags);
      });

      // CRITICAL: Add existing events that weren't in the range
      // This prevents cache from being overwritten and losing other events
      currentData.forEach(event => {
        if (!seenIds.has(event._id!)) {
          updatedEvents.push(event);
        }
      });

      // Memory management: Limit cache size to prevent memory issues
      const MAX_CACHED_EVENTS = 300; // Balanced limit - good UX without excessive memory
      let finalEvents = updatedEvents;
      
      if (updatedEvents.length > MAX_CACHED_EVENTS) {
        // Sort by last updated time and keep most recent events
        finalEvents = updatedEvents
          .sort((a, b) => {
            const timeA = a._metadata?.lastUpdated?.getTime() || 0;
            const timeB = b._metadata?.lastUpdated?.getTime() || 0;
            return timeB - timeA; // Most recent first
          })
          .slice(0, MAX_CACHED_EVENTS);
      }

      // Update the unified cache only if we have changes
      // Use setQueryData with updater function for better performance
      queryClient.setQueryData(QUERY_KEYS.EVENTS, (oldData: EventWithTags[] | undefined) => {
        // If no old data, return final events
        if (!oldData || oldData.length === 0) {
          return finalEvents;
        }
        
        // If final events are the same as old data, don't trigger rerender
        if (finalEvents.length === oldData.length) {
          const isSame = finalEvents.every((event, index) => 
            oldData[index] && event._id === oldData[index]._id
          );
          if (isSame) {
            return oldData; // Return same reference to prevent unnecessary rerenders
          }
        }
        
        return finalEvents;
      });
      
    } catch (error) {
      console.error('Failed to update cache with range events:', error);
      // On error, don't clear existing cache - preserve cache-first behavior
    }
  }, [userId, queryClient]);

  return {
    updateCacheWithRangeEvents,
  };
};