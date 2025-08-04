import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Event } from '@/types/allTypes';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';

/**
 * TanStack Query hook for fetching event by ID
 * 
 * This replaces useGetEventById with proper caching, automatic refetching,
 * and integration with the rest of the TanStack Query ecosystem.
 */

interface UseEventByIdQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

interface EventByIdResult {
  event: Event | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  isStale: boolean;
}

export const useEventByIdQuery = (
  eventId: string,
  options: UseEventByIdQueryOptions = {}
): EventByIdResult => {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes - event details don't change frequently
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  const query = useQuery({
    queryKey: queryKeys.eventById(eventId),
    queryFn: async (): Promise<Event> => {
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
      
      if (!response.data.found_event) {
        throw new Error('Event not found');
      }

      console.log('---------', response.data)
      return response.data.event;
    },
    enabled: enabled && !!eventId,
    staleTime,
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer for navigation back/forth
    refetchOnMount,
    refetchOnWindowFocus,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (event not found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });


  // Log cached data whenever it changes
  React.useEffect(() => {
    if (query.data) {
      console.log('💾 [EVENT CACHE] Cached event data updated:', {
        eventId: query.data._id,
        title: query.data.title,
        attendeesCount: query.data.attendees?.length || 0,
        hasAttendees: !!query.data.attendees,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        dataUpdatedAt: new Date(query.dataUpdatedAt).toLocaleTimeString()
      });
      console.log('💾 [EVENT CACHE] Full event data:', query.data);
    }
  }, [query.data, query.isLoading, query.isFetching, query.dataUpdatedAt]);

  return {
    event: query.data || null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isStale: query.isStale,
  };
};

// Helper hook for prefetching event data (useful when navigating from lists)
export const usePrefetchEventById = () => {
  const queryClient = useQueryClient();

  return (eventId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventById(eventId),
      queryFn: async () => {
        const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
        return response.data.event;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
};