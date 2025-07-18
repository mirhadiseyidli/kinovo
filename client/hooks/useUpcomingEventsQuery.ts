import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { queryFunctions } from '@/utils/queryFunctions';
import { Event } from '@/types/allTypes';

/**
 * React Query hook for fetching upcoming events
 * 
 * This replaces the useGetMyEvents hook and LRU cache with React Query
 * 
 * Key improvements:
 * - Automatic background refetching
 * - Better error handling and retry logic
 * - Optimistic updates support
 * - Built-in loading states
 * - Better memory management
 * - Devtools integration
 */

interface UseUpcomingEventsOptions {
  fromHomeScreen?: boolean;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export const useUpcomingEventsQuery = (options: UseUpcomingEventsOptions = {}) => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  
  const {
    fromHomeScreen = false,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes (matches LRU cache TTL)
    cacheTime = 1000 * 60 * 10, // 10 minutes
  } = options;

  const query = useQuery({
    // Unique query key for this specific query
    queryKey: queryKeys.upcomingEvents(userId || '', fromHomeScreen),
    
    // Query function
    queryFn: queryFunctions.upcomingEvents(userId || '', fromHomeScreen),
    
    // Only run if we have a userId and the query is enabled
    enabled: Boolean(userId) && enabled,
    
    // Cache configuration
    staleTime,
    cacheTime,
    
    // Refetch on window focus (like pull-to-refresh)
    refetchOnWindowFocus: true,
    
    // Refetch on network reconnect
    refetchOnReconnect: true,
    
    // Don't refetch on mount if we have fresh data
    refetchOnMount: 'always',
    
    // Background refetch interval (disabled by default)
    refetchInterval: false,
    
    // Error handling
    onError: (error) => {
      console.error('Failed to fetch upcoming events:', error);
    },
    
    // Success callback
    onSuccess: (data) => {
      // Optionally update related queries or perform side effects
      console.log(`Fetched ${data.length} upcoming events`);
    },
  });

  // Additional methods for cache management
  const invalidateUpcomingEvents = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.upcomingEvents(userId || '', fromHomeScreen),
    });
  };

  const updateUpcomingEventsCache = (updatedEvents: Event[]) => {
    queryClient.setQueryData(
      queryKeys.upcomingEvents(userId || '', fromHomeScreen),
      updatedEvents
    );
  };

  const updateSingleEventInCache = (eventId: string, updatedEvent: Event) => {
    queryClient.setQueryData(
      queryKeys.upcomingEvents(userId || '', fromHomeScreen),
      (oldData: Event[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(event => 
          event._id === eventId ? updatedEvent : event
        );
      }
    );
  };

  const removeEventFromCache = (eventId: string) => {
    queryClient.setQueryData(
      queryKeys.upcomingEvents(userId || '', fromHomeScreen),
      (oldData: Event[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(event => event._id !== eventId);
      }
    );
  };

  const prefetchUpcomingEvents = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.upcomingEvents(userId || '', fromHomeScreen),
      queryFn: queryFunctions.upcomingEvents(userId || '', fromHomeScreen),
      staleTime,
    });
  };

  return {
    // Query state
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isStale: query.isStale,
    
    // Refetch function (replaces the manual refresh in old hook)
    refetch: query.refetch,
    
    // Cache management methods
    invalidateUpcomingEvents,
    updateUpcomingEventsCache,
    updateSingleEventInCache,
    removeEventFromCache,
    prefetchUpcomingEvents,
    
    // Legacy compatibility (to ease migration)
    events: query.data || [],
    loading: query.isLoading,
    isFirstFetch: query.isLoading && !query.data,
    
    // Additional React Query methods
    fetchStatus: query.fetchStatus,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
  };
};

/**
 * Migration Guide from useGetMyEvents to useUpcomingEventsQuery:
 * 
 * OLD CODE:
 * ```
 * const { events, loading, isFirstFetch, refreshEvents, clearCache } = useGetMyEvents(true);
 * ```
 * 
 * NEW CODE:
 * ```
 * const { 
 *   data: events, 
 *   isLoading: loading, 
 *   isFirstFetch, 
 *   refetch: refreshEvents,
 *   invalidateUpcomingEvents: clearCache
 * } = useUpcomingEventsQuery({ fromHomeScreen: true });
 * ```
 * 
 * Key differences:
 * 1. No need for manual cache management - React Query handles it
 * 2. Automatic background refetching
 * 3. Better error handling with retry logic
 * 4. More granular loading states
 * 5. Built-in optimistic updates support
 * 6. Better memory management
 */