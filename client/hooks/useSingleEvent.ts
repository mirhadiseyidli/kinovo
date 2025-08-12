import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

/**
 * Hook to fetch a single event by ID
 * Replaces useEventByIdQuery from the old implementation
 * 
 * This hook fetches individual events and can be used for:
 * - Event detail pages
 * - Sharing functionality
 * - Any component that needs a specific event
 */
export const useSingleEvent = (eventId: string) => {
  return useQuery({
    queryKey: ['events', 'single', eventId],
    queryFn: async (): Promise<Event> => {
      const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
      
      // Handle both events array and single event response format
      if (response.data.events && Array.isArray(response.data.events) && response.data.events.length > 0) {
        const eventToView = response.data.events.find((event: Event) => !!event.eventToView);
        return eventToView ?? response.data.events[0];
      }
      if (response.data.event) {
        return response.data.event;
      }
      // Ensure we never return undefined - throw error if no event found
      throw new Error(`Event with ID ${eventId} not found`);
    },
    enabled: !!eventId,
    // Cache-first with background refresh configuration
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    networkMode: 'offlineFirst',
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Backward compatibility hook with the same interface as useEventByIdQuery
 */
export const useEventByIdQuery = (eventId: string) => {
  const query = useSingleEvent(eventId);
  
  return {
    event: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isError: query.isError,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};