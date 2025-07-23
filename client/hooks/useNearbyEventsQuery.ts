import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
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
 * Enhanced React Query hook for fetching nearby events
 * 
 * This replaces the useGetNearByEvents hook with React Query
 * 
 * Key improvements:
 * - Automatic background refetching
 * - Better error handling and retry logic
 * - Optimistic updates support
 * - Built-in loading states
 * - Better memory management
 * - Devtools integration
 * - Location-based caching
 * - Smooth UI transitions
 * - Distance filtering support
 */

interface UseNearbyEventsOptions {
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  // UI enhancement options
  displayMode?: 'full' | 'list' | 'minimal' | 'homeScreen' | 'preview';
  enableSmoothTransitions?: boolean;
  keepPreviousData?: boolean;
  usePlaceholderData?: boolean;
  // Preview mode options (for home screen carousel)
  previewMode?: boolean;
  previewLimit?: number;
  // Callbacks
  onFinishRefresh?: () => void;
  // Location options
  locationText?: string; // For display purposes
}

interface NearbyEventsResponse {
  events: Event[];
  totalCount?: number;
}

export const useNearbyEventsQuery = (options: UseNearbyEventsOptions = {}) => {
  const queryClient = useQueryClient();
  
  const {
    latitude,
    longitude, 
    distance = 50,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes
    gcTime = 1000 * 60 * 10, // 10 minutes
    // UI enhancement options
    displayMode = 'full',
    enableSmoothTransitions = true,
    keepPreviousData: keepPreviousDataOption = true,
    usePlaceholderData = true,
    // Preview mode options
    previewMode = false,
    previewLimit = 5,
    // Callbacks
    onFinishRefresh,
    // Location options
    locationText,
  } = options;

  // Generate stable query key to prevent unnecessary re-renders
  const stableQueryKey = queryKeys.nearbyEvents(
    latitude || 0, 
    longitude || 0, 
    distance
  );
  
  // Create enhanced query function
  const nearbyEventsQueryFn = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!latitude || !longitude) {
      throw new Error('Location coordinates are required');
    }
    
    try {
      const response = await api.get(
        `/api/manageevents/eventslist/get/nearby/events?lat=${latitude}&lng=${longitude}&distance=${distance}`,
        { signal }
      );
      
      let events = response.data.events || [];
      const totalCount = events.length;
      
      // Apply preview limit if in preview mode
      if (previewMode && previewLimit) {
        events = events.slice(0, previewLimit);
      }
      
      const result: NearbyEventsResponse = {
        events,
        totalCount
      };
      
      return result;
    } finally {
      // Call onFinishRefresh if provided (for pull-to-refresh completion)
      if (onFinishRefresh) {
        onFinishRefresh();
      }
    }
  }, [latitude, longitude, distance, previewMode, previewLimit, onFinishRefresh]);
  
  // Select function for data transformation
  const selectData = useCallback((data: NearbyEventsResponse) => {
    if (!data?.events) return { events: [], totalCount: 0 };
    
    let processedEvents = data.events;
    
    switch (displayMode) {
      case 'homeScreen':
      case 'preview':
        // Home screen - return original events, no transformation
        return data;
      case 'list':
        processedEvents = selectEventsForList(data.events);
        break;
      case 'minimal':
        processedEvents = data.events.map(event => ({
          _id: event._id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          location: event.location,
          category: event.category,
        }));
        break;
      case 'full':
      default:
        processedEvents = selectEventsWithDisplayData(data.events);
        break;
    }
    
    return {
      events: processedEvents,
      totalCount: data.totalCount || 0
    };
  }, [displayMode]);

  const query = useQuery({
    // Stable query key prevents unnecessary re-renders
    queryKey: stableQueryKey,
    
    // Enhanced query function
    queryFn: nearbyEventsQueryFn,
    
    // Only run if we have coordinates and the query is enabled
    enabled: Boolean(latitude && longitude) && enabled,
    
    // Cache configuration - nearby events can change frequently
    staleTime,
    gcTime,
    
    // Smooth UI options - only use select for non-homeScreen modes
    select: enableSmoothTransitions && !['homeScreen', 'preview'].includes(displayMode) ? selectData : undefined,
    placeholderData: usePlaceholderData ? createPlaceholderData.nearbyEvents() : (keepPreviousDataOption ? (prev: any) => prev : undefined),
    
    // Refetch configuration
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
    refetchInterval: false,
  });

  // Additional methods for cache management using stable query key
  const invalidateNearbyEvents = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.nearbyEvents(latitude || 0, longitude || 0, distance),
    });
  };

  const updateNearbyEventsCache = (updatedData: NearbyEventsResponse) => {
    queryClient.setQueryData(stableQueryKey, updatedData);
  };

  const updateSingleEventInCache = (eventId: string, updatedEvent: Event) => {
    queryClient.setQueryData(
      stableQueryKey,
      (oldData: NearbyEventsResponse | undefined) => {
        if (!oldData?.events) return oldData;
        return {
          ...oldData,
          events: oldData.events.map(event => 
            event._id === eventId ? updatedEvent : event
          )
        };
      }
    );
  };

  const removeEventFromCache = (eventId: string) => {
    queryClient.setQueryData(
      stableQueryKey,
      (oldData: NearbyEventsResponse | undefined) => {
        if (!oldData?.events) return oldData;
        return {
          ...oldData,
          events: oldData.events.filter(event => event._id !== eventId),
          totalCount: Math.max(0, (oldData.totalCount || 0) - 1)
        };
      }
    );
  };

  const prefetchNearbyEvents = () => {
    queryClient.prefetchQuery({
      queryKey: stableQueryKey,
      queryFn: nearbyEventsQueryFn,
      staleTime,
    });
  };

  // Handle errors and success cases
  if (query.isError) {
    console.error('Failed to fetch nearby events:', query.error);
  }
  
  if (query.isSuccess && query.data) {
    // Only log on initial success or when data changes significantly
    const shouldLog = query.dataUpdatedAt && Date.now() - query.dataUpdatedAt < 1000;
    if (shouldLog) {
      const eventCount = Array.isArray(query.data.events) ? query.data.events.length : 'unknown';
      console.log(`Fetched ${eventCount} nearby events (total: ${query.data.totalCount || 0})`);
    }
  }

  // Enhanced error state with smooth UI support
  const errorState = query.isError ? createErrorStateData(query.error, query.data) : null;

  // Smooth UI state indicators
  const isShowingPlaceholder = usePlaceholderData && query.isLoading && !query.data;
  const isShowingPreviousData = keepPreviousDataOption && query.isFetching && !query.isLoading && query.data;
  const isTransitioning = query.isFetching && !query.isLoading;

  // Process data for homeScreen/preview mode if select wasn't used
  const processedData = ['homeScreen', 'preview'].includes(displayMode) && query.data 
    ? (query.data as NearbyEventsResponse)
    : query.data || { events: [], totalCount: 0 };

  return {
    // Query state
    data: processedData,
    events: processedData.events || [],
    totalCount: processedData.totalCount || 0,
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
    invalidateNearbyEvents,
    updateNearbyEventsCache,
    updateSingleEventInCache,
    removeEventFromCache,
    prefetchNearbyEvents,
    
    // Legacy compatibility (to ease migration)
    loading: query.isLoading,
    isFirstFetch: query.isLoading && !query.data,
    
    // Additional React Query methods
    fetchStatus: query.fetchStatus,
    dataUpdatedAt: query.dataUpdatedAt,
    errorUpdatedAt: query.errorUpdatedAt,
    
    // Configuration info
    displayMode,
    enableSmoothTransitions,
    locationText,
    distance,
    previewMode,
  };
};

/**
 * Migration Guide from useGetNearByEvents to useNearbyEventsQuery:
 * 
 * OLD CODE:
 * ```
 * const { fetchNearByEventsPreview, loading, isFirstFetch, error } = useGetNearByEvents();
 * const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
 * const [totalEventCount, setTotalEventCount] = useState(0);
 * 
 * const fetchEvents = async () => {
 *   const result = await fetchNearByEventsPreview(lat, lng, distance);
 *   setNearbyEvents(result.events || []);
 *   setTotalEventCount(result.totalCount || 0);
 * };
 * ```
 * 
 * NEW CODE:
 * ```
 * const { 
 *   events: nearbyEvents,
 *   totalCount: totalEventCount,
 *   isLoading: loading, 
 *   isFirstFetch, 
 *   error,
 *   refetch: fetchEvents
 * } = useNearbyEventsQuery({ 
 *   latitude: lat,
 *   longitude: lng,
 *   distance,
 *   previewMode: true,
 *   displayMode: 'homeScreen'
 * });
 * ```
 * 
 * Key differences:
 * 1. No need for manual state management - React Query handles it
 * 2. Automatic background refetching
 * 3. Better error handling with retry logic
 * 4. More granular loading states
 * 5. Built-in optimistic updates support
 * 6. Better memory management
 * 7. Location-based query key generation for proper caching
 * 8. Preview mode built into the hook
 */