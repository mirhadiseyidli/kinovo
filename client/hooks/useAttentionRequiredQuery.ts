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

/**
 * Enhanced React Query hook for fetching attention required events
 * 
 * This replaces the useGetAttentionRequiredEvents hook and LRU cache with React Query
 * 
 * Key improvements:
 * - Automatic background refetching
 * - Better error handling and retry logic
 * - Optimistic updates support
 * - Built-in loading states
 * - Better memory management
 * - Devtools integration
 * - Home screen optimization support
 * - Smooth UI transitions
 * - Context integration for global refreshes
 */

interface UseAttentionRequiredOptions {
  fromHomeScreen?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  // UI enhancement options
  displayMode?: 'full' | 'list' | 'minimal' | 'homeScreen';
  enableSmoothTransitions?: boolean;
  keepPreviousData?: boolean;
  usePlaceholderData?: boolean;
  // Home screen specific options
  limit?: number;
  onFinishRefresh?: () => void;
  // Context integration
  contextRefreshing?: boolean;
}

export const useAttentionRequiredQuery = (options: UseAttentionRequiredOptions = {}) => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  
  const {
    fromHomeScreen = false,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes (matches LRU cache TTL)
    gcTime = 1000 * 60 * 10, // 10 minutes
    // UI enhancement options
    displayMode = 'full',
    enableSmoothTransitions = true,
    keepPreviousData: keepPreviousDataOption = true,
    usePlaceholderData = true,
    // Home screen specific options
    limit,
    onFinishRefresh,
    // Context integration
    contextRefreshing = false,
  } = options;

  // Generate stable query key to prevent unnecessary re-renders
  const stableQueryKey = queryKeys.attentionRequiredEvents(userId || '', fromHomeScreen);
  
  // Create enhanced query function with home screen optimization
  const attentionRequiredQueryFn = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    try {
      const queryParams = fromHomeScreen ? '?from_home_screen=true' : '';
      const response = await api.get(
        `/api/manageevents/eventslist/get/attention/required${queryParams}`,
        { signal }
      );
      
      let events = response.data.events || [];
      
      // Apply home screen limit if specified
      if (limit && fromHomeScreen) {
        events = events.slice(0, limit);
      }
      
      // Filter out past events
      const now = new Date();
      events = events.filter((event: Event) => {
        const eventStartDate = event.start_time ? new Date(event.start_time) : null;
        return eventStartDate && now < eventStartDate;
      });
      
      return events;
    } finally {
      // Call onFinishRefresh if provided (for pull-to-refresh completion)
      if (onFinishRefresh) {
        onFinishRefresh();
      }
    }
  }, [userId, fromHomeScreen, limit, onFinishRefresh]);
  
  // Context integration - invalidate when context signals refresh
  useEffect(() => {
    if (contextRefreshing && userId) {
      queryClient.invalidateQueries({
        queryKey: stableQueryKey,
      });
    }
  }, [contextRefreshing, queryClient, stableQueryKey, userId]);
  
  // Select function for data transformation
  const selectData = useCallback((data: Event[]) => {
    if (!data) return [];
    
    switch (displayMode) {
      case 'homeScreen':
        // Home screen - return original events with limit, no transformation
        // AttentionRequired component expects original Event interface
        return data.slice(0, limit || 3);
      case 'list':
        return selectEventsForList(data);
      case 'minimal':
        return data.map(event => ({
          _id: event._id,
          title: event.title,
          start_time: event.start_time,
          location: event.location,
          userStatus: event.userStatus,
          creator: event.creator,
        }));
      case 'full':
      default:
        return selectEventsWithDisplayData(data);
    }
  }, [displayMode, limit]);

  const query = useQuery({
    // Stable query key prevents unnecessary re-renders
    queryKey: stableQueryKey,
    
    // Enhanced query function with home screen optimization
    queryFn: attentionRequiredQueryFn,
    
    // Only run if we have a userId and the query is enabled
    enabled: Boolean(userId) && enabled,
    
    // Cache configuration
    staleTime,
    gcTime,
    
    // Smooth UI options - only use select for non-homeScreen modes to maintain Event[] type
    select: enableSmoothTransitions && displayMode !== 'homeScreen' ? selectData : undefined,
    placeholderData: usePlaceholderData ? createPlaceholderData.attentionRequired() : (keepPreviousDataOption ? (prev: any) => prev : undefined),
    
    // Refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  // Log when query data changes
  useEffect(() => {
    if (query.data) {
      console.log('📨 [ATTENTION REQUIRED QUERY] Data updated:', {
        queryKey: JSON.stringify(stableQueryKey),
        eventCount: query.data?.length || 0,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isError: query.isError,
        fromHomeScreen
      });
    }
  }, [query.data, query.isLoading, query.isFetching, query.isError, stableQueryKey, fromHomeScreen]);

  // Additional methods for cache management using stable query key
  const invalidateAttentionRequired = () => {
    queryClient.invalidateQueries({
      queryKey: stableQueryKey,
    });
  };

  const updateAttentionRequiredCache = (updatedEvents: Event[]) => {
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

  const prefetchAttentionRequired = () => {
    queryClient.prefetchQuery({
      queryKey: stableQueryKey,
      queryFn: attentionRequiredQueryFn,
      staleTime,
    });
  };

  // Handle errors and success cases
  if (query.isError) {
    console.error('Failed to fetch attention required events:', query.error);
  }

  // Enhanced error state with smooth UI support
  const errorState = query.isError ? createErrorStateData(query.error, query.data) : null;

  // Smooth UI state indicators
  const isShowingPlaceholder = usePlaceholderData && query.isLoading && !query.data;
  const isShowingPreviousData = keepPreviousDataOption && query.isFetching && !query.isLoading && query.data;
  const isTransitioning = query.isFetching && !query.isLoading;

  // Process data for homeScreen mode if select wasn't used
  const processedData = displayMode === 'homeScreen' && query.data 
    ? (query.data as Event[]).slice(0, limit || 3)
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
    invalidateAttentionRequired,
    updateAttentionRequiredCache,
    updateSingleEventInCache,
    removeEventFromCache,
    prefetchAttentionRequired,
    
    // Legacy compatibility (to ease migration)
    attentionEventsList: processedData,
    loading: query.isLoading,
    isFirstFetch: query.isLoading && !query.data,
    
    // Additional React Query methods
    fetchStatus: query.fetchStatus,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    
    // Configuration info
    displayMode,
    enableSmoothTransitions,
  };
};

/**
 * Migration Guide from useGetAttentionRequiredEvents to useAttentionRequiredQuery:
 * 
 * OLD CODE:
 * ```
 * const { 
 *   fetchAttentionRequiredEvents, 
 *   loading, 
 *   isFirstFetch, 
 *   error, 
 *   clearCache, 
 *   attentionEventsList 
 * } = useGetAttentionRequiredEvents();
 * ```
 * 
 * NEW CODE:
 * ```
 * const { 
 *   refetch: fetchAttentionRequiredEvents,
 *   isLoading: loading, 
 *   isFirstFetch, 
 *   error,
 *   invalidateAttentionRequired: clearCache,
 *   data: attentionEventsList
 * } = useAttentionRequiredQuery({ fromHomeScreen: true });
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