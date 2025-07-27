import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';
import { 
  selectEventsWithDisplayData, 
  selectEventsForList, 
  createPlaceholderData,
  shouldKeepPreviousData,
  createErrorStateData 
} from '@/utils/smoothUIHelpers';
import type { DateFilter } from '@/components/Home/EventFilters';

/**
 * Enhanced React Query hook for fetching past events
 * 
 * This replaces the useGetMyPastEvents hook and LRU cache with React Query
 * 
 * Key improvements:
 * - Automatic background refetching
 * - Better error handling and retry logic
 * - Optimistic updates support
 * - Built-in loading states
 * - Better memory management
 * - Devtools integration
 * - Smooth UI transitions
 * - Context integration for global refreshes
 * - Date filtering support
 */


interface UsePastEventsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  // UI enhancement options
  displayMode?: 'full' | 'list' | 'minimal' | 'homeScreen';
  enableSmoothTransitions?: boolean;
  keepPreviousData?: boolean;
  usePlaceholderData?: boolean;
  // Filtering options
  dateFilter?: DateFilter;
  // Callbacks
  onFinishRefresh?: () => void;
  // Context integration
  contextRefreshing?: boolean;
}

export const usePastEventsQuery = (options: UsePastEventsOptions = {}) => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  
  const {
    enabled = true,
    staleTime = 1000 * 60 * 10, // 10 minutes (past events change less frequently)
    gcTime = 1000 * 60 * 30, // 30 minutes
    // UI enhancement options
    displayMode = 'full',
    enableSmoothTransitions = true,
    keepPreviousData: keepPreviousDataOption = true,
    usePlaceholderData = true,
    // Filtering options
    dateFilter = { type: 'all', date: null },
    // Callbacks
    onFinishRefresh,
    // Context integration
    contextRefreshing = false,
  } = options;

  // Generate stable query key to prevent unnecessary re-renders
  // Include filter parameters in the query key for proper caching
  const stableQueryKey = queryKeys.pastEvents(
    userId || '', 
    dateFilter.type === 'year' && dateFilter.date ? dateFilter.date.getFullYear() : undefined,
    dateFilter.type === 'month' && dateFilter.date ? dateFilter.date.getMonth() : undefined
  );
  
  // Create enhanced query function
  const pastEventsQueryFn = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const response = await api.get(
        '/api/manageevents/eventslist/get/my/past/events',
        { signal }
      );
      
      let events = response.data.past_events || [];
      
      // Apply date filtering on the client side for better caching
      // We cache all events and filter them based on the dateFilter
      if (dateFilter.type !== 'all' && dateFilter.date) {
        events = filterEventsByDate(events, dateFilter);
      }
      
      return events;
    } finally {
      // Call onFinishRefresh if provided (for pull-to-refresh completion)
      if (onFinishRefresh) {
        onFinishRefresh();
      }
    }
  }, [userId, dateFilter, onFinishRefresh]);
  
  // Context integration - invalidate when context signals refresh
  useEffect(() => {
    if (contextRefreshing && userId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pastEvents(userId),
      });
    }
  }, [contextRefreshing, queryClient, userId]);
  
  // Select function for data transformation
  const selectData = useCallback((data: Event[]) => {
    if (!data) return [];
    
    switch (displayMode) {
      case 'homeScreen':
        // Home screen - return original events, no transformation
        return data;
      case 'list':
        return selectEventsForList(data);
      case 'minimal':
        return data.map(event => ({
          _id: event._id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          category: event.category,
        }));
      case 'full':
      default:
        return selectEventsWithDisplayData(data);
    }
  }, [displayMode]);

  const query = useQuery({
    // Stable query key prevents unnecessary re-renders
    queryKey: stableQueryKey,
    
    // Enhanced query function
    queryFn: pastEventsQueryFn,
    
    // Only run if we have a userId and the query is enabled
    enabled: Boolean(userId) && enabled,
    
    // Cache configuration - past events can be cached longer
    staleTime,
    gcTime,
    
    // Smooth UI options - only use select for non-homeScreen modes
    select: enableSmoothTransitions && displayMode !== 'homeScreen' ? selectData : undefined,
    placeholderData: usePlaceholderData ? createPlaceholderData.pastEvents() : (keepPreviousDataOption ? (prev: any) => prev : undefined),
    
    // Refetch configuration - past events don't need frequent updates
    refetchOnWindowFocus: false, // Past events don't change often
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  // Additional methods for cache management using stable query key
  const invalidatePastEvents = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.pastEvents(userId || ''),
    });
  };

  const updatePastEventsCache = (updatedEvents: Event[]) => {
    queryClient.setQueryData(stableQueryKey, updatedEvents);
  };

  const updateSingleEventInCache = (eventId: string, updatedEvent: Event) => {
    queryClient.setQueryData(
      stableQueryKey,
      (oldData: Event[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(event => 
          event._id === eventId || event.originalEventId === eventId ? updatedEvent : event
        );
      }
    );
  };

  const removeEventFromCache = (eventId: string) => {
    queryClient.setQueryData(
      stableQueryKey,
      (oldData: Event[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.filter(event => event._id !== eventId && event.originalEventId !== eventId);
      }
    );
  };

  const prefetchPastEvents = () => {
    queryClient.prefetchQuery({
      queryKey: stableQueryKey,
      queryFn: pastEventsQueryFn,
      staleTime,
    });
  };

  // Handle errors and success cases
  if (query.isError) {
    console.error('Failed to fetch past events:', query.error);
  }
  
  if (query.isSuccess && query.data) {
    // Only log on initial success or when data changes significantly
    const shouldLog = query.dataUpdatedAt && Date.now() - query.dataUpdatedAt < 1000;
    if (shouldLog) {
      console.log(`Fetched ${Array.isArray(query.data) ? query.data.length : 'unknown'} past events`);
    }
  }

  // Enhanced error state with smooth UI support
  const errorState = query.isError ? createErrorStateData(query.error, query.data) : null;

  // Smooth UI state indicators
  const isShowingPlaceholder = usePlaceholderData && query.isLoading && !query.data;
  const isShowingPreviousData = keepPreviousDataOption && query.isFetching && !query.isLoading && query.data;
  const isTransitioning = query.isFetching && !query.isLoading;

  // Process data for homeScreen mode if select wasn't used
  const processedData = displayMode === 'homeScreen' && query.data 
    ? (query.data as Event[])
    : query.data || [];

  return {
    // Query state
    data: processedData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isStale: query.isStale,
    
    // Smooth UI state
    isShowingPlaceholder,
    isShowingPreviousData,
    isTransitioning,
    errorState,
    
    // UI helpers
    shouldKeepPreviousData: shouldKeepPreviousData(query.data, query.isLoading, query.isFetching, query.error),
    
    // Refetch function (replaces the manual refresh in old hook)
    refetch: query.refetch,
    
    // Cache management methods
    invalidatePastEvents,
    updatePastEventsCache,
    updateSingleEventInCache,
    removeEventFromCache,
    prefetchPastEvents,
    
    // Legacy compatibility (to ease migration)
    pastEventsList: processedData,
    loading: query.isLoading,
    isFirstFetch: query.isLoading && !query.data,
    
    // Additional React Query methods
    fetchStatus: query.fetchStatus,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    
    // Configuration info
    displayMode,
    enableSmoothTransitions,
    dateFilter,
  };
};

/**
 * Helper function to filter events by date (moved from component)
 */
const filterEventsByDate = (events: Event[], filter: DateFilter): Event[] => {
  if (!events || events.length === 0) return [];
  
  // For 'all' type, return the original sorted array
  if (filter.type === 'all' || !filter.date) {
    return events.sort((a, b) => {
      const dateA = new Date(a.start_time || 0);
      const dateB = new Date(b.start_time || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }

  const filterDate = filter.date;
  
  return events.filter(event => {
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    
    switch (filter.type) {
      case 'year':
        return eventDate.getFullYear() === filterDate.getFullYear();
      case 'month':
        return eventDate.getFullYear() === filterDate.getFullYear() &&
               eventDate.getMonth() === filterDate.getMonth();
      default:
        return true;
    }
  }).sort((a, b) => {
    const dateA = new Date(a.start_time || 0);
    const dateB = new Date(b.start_time || 0);
    return dateB.getTime() - dateA.getTime();
  });
};

/**
 * Migration Guide from useGetMyPastEvents to usePastEventsQuery:
 * 
 * OLD CODE:
 * ```
 * const { 
 *   fetchMyPastEvents, 
 *   loading, 
 *   isFirstFetch, 
 *   error, 
 *   clearCache 
 * } = useGetMyPastEvents();
 * ```
 * 
 * NEW CODE:
 * ```
 * const { 
 *   refetch: fetchMyPastEvents,
 *   isLoading: loading, 
 *   isFirstFetch, 
 *   error,
 *   invalidatePastEvents: clearCache,
 *   data: pastEventsList
 * } = usePastEventsQuery({ 
 *   displayMode: 'homeScreen',
 *   dateFilter: activeFilter
 * });
 * ```
 * 
 * Key differences:
 * 1. No need for manual cache management - React Query handles it
 * 2. Automatic background refetching
 * 3. Better error handling with retry logic
 * 4. More granular loading states
 * 5. Built-in optimistic updates support
 * 6. Better memory management
 * 7. Date filtering moved to query level for better caching
 */