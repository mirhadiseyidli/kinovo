import React from 'react';
import { useInfiniteQuery, QueryFunctionContext, InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { queryKeys } from '@/utils/queryKeys';
import { createStableQueryKey } from '@/utils/stableQueryKey';
import api from '@/utils/api';
import { User } from '@/types/allTypes';

/**
 * Comprehensive Infinite Query Hook for Events
 * 
 * This hook provides a unified interface for infinite queries on event data,
 * supporting various event types and filters with proper TypeScript typing.
 */

// Base event interface
export interface Event {
  _id?: string;
  creator?: User;
  event_picture?: string | null;
  status: string;
  created_at?: Date;
  updated_at?: Date;
  title: string;
  category: string | null;
  description?: string | null;
  location: {
    text: string | null;
    city: string | null;
    state: string | null;
    coordinates: {
      lat: number | null;
      lng: number | null;
    };
  };
  start_time: Date | null;
  end_time: Date | null;
  capacity?: number | null;
  maxParticipants?: number;
  participants?: string[];
  images?: string[];
  isRecurring?: boolean;
  recurringPattern?: any;
  recurrence?: {
    checked: boolean;
    frequency: string | null;
    end_date: Date | null;
  };
  attendees?: {
    user: User; // Make sure 'Events' is imported
    status: 'pending' | 'maybe' | 'accepted' | 'rejected';
  }[];
  visibility: string;
  // User's status for this event (from the user's events array)
  userStatus?: 'pending' | 'maybe' | 'accepted' | 'rejected';
  // Properties for recurring event occurrences (added by backend)
  originalEventId?: string;        // Reference to original recurring event
  isRecurringOccurrence?: boolean; // Flag to identify recurring occurrences
}


// Pagination response interface
export interface PaginatedEventsResponse {
  events: Event[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  nextCursor?: string;
}

// Query parameters interface
export interface InfiniteEventsQueryParams {
  // Event type filters
  eventType?: 'upcoming' | 'past' | 'attention-required' | 'nearby' | 'friends' | 'recommended' | 'search' | 'user' | 'category' | 'city';
  
  // Location filters (for nearby events)
  latitude?: number;
  longitude?: number;
  distance?: number;
  
  // User filters
  userId?: string;
  
  // Search filters
  searchQuery?: string;
  category?: string;
  city?: string;
  
  // Date filters
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number; // 0-11 (JavaScript month format)
  
  // Pagination settings
  pageSize?: number;
  
  // UI preferences
  enableSmooth?: boolean;
  keepPreviousData?: boolean;
  refetchOnWindowFocus?: boolean;
}

// Hook configuration
export interface UseInfiniteEventsQueryConfig extends InfiniteEventsQueryParams {
  // Query options
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number | false;
  
  // Callbacks
  onSuccess?: (data: PaginatedEventsResponse) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
}

// API function type
type EventsApiFunction = (params: {
  page: number;
  limit: number;
  [key: string]: unknown;
}) => Promise<PaginatedEventsResponse>;

// API functions mapping
const eventsApiMap: Record<string, EventsApiFunction> = {
  upcoming: async ({ page, limit, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/get/my/upcoming/events', {
      params: { page, limit, ...params }
    });
    return response.data;
  },
  
  past: async ({ page, limit, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/get/my/past/events', {
      params: { page, limit, ...params }
    });
    return response.data;
  },
  
  'attention-required': async ({ page, limit, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/get/attention/required', {
      params: { page, limit, ...params }
    });
    return response.data;
  },
  
  nearby: async ({ page, limit, latitude, longitude, distance, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
      params: { 
        page, 
        limit, 
        lat: latitude, 
        lng: longitude, 
        distance,
        ...params 
      }
    });
    return response.data;
  },
  
  friends: async ({ page, limit, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/friends', {
      params: { page, limit, ...params }
    });
    
    // Log the response to debug
    console.log('Friends events API response:', response.data);
    
    // Handle both response formats
    if (Array.isArray(response.data)) {
      // If response.data is an array directly (old format)
      return {
        events: response.data,
        totalCount: response.data.length,
        hasMore: false,
        currentPage: page || 1,
        totalPages: 1
      };
    }
    
    // Otherwise expect paginated format
    return response.data;
  },
  
  recommended: async ({ page, limit, ...params }) => {
    const response = await api.get('/api/manageevents/eventslist/get/recommended', {
      params: { page, limit, ...params }
    });
    return response.data;
  },
  
  search: async ({ page, limit, searchQuery, category, ...params }) => {
    const response = await api.get('/api/search/events', {
      params: { 
        page, 
        limit, 
        q: searchQuery, 
        category,
        ...params 
      }
    });
    return response.data;
  },
  
  user: async ({ page, limit, userId, ...params }) => {
    const response = await api.get(`/api/manageevents/eventslist/get/user/${userId}`, {
      params: { page, limit, ...params }
    });
    return response.data;
  },
  
  category: async ({ page, limit, category, ...params }) => {
    const response = await api.get(`/api/manageevents/eventslist/category/${encodeURIComponent(category as string)}`, {
      params: { page, limit, ...params }
    });
    
    // Handle both response formats (like friends events)
    if (Array.isArray(response.data)) {
      // If response.data is an array directly (old format)
      return {
        events: response.data,
        totalCount: response.data.length,
        hasMore: false,
        currentPage: page || 1,
        totalPages: 1
      };
    }
    
    // Otherwise expect paginated format
    return response.data;
  },
  
  city: async ({ page, limit, city, ...params }) => {
    const response = await api.get(`/api/manageevents/eventslist/city/${encodeURIComponent(city as string)}`, {
      params: { page, limit, ...params }
    });
    
    // Handle both response formats (like friends events)
    if (Array.isArray(response.data)) {
      // If response.data is an array directly (old format)
      return {
        events: response.data,
        totalCount: response.data.length,
        hasMore: false,
        currentPage: page || 1,
        totalPages: 1
      };
    }
    
    // Otherwise expect paginated format
    return response.data;
  },
};

export const useInfiniteEventsQuery = (config: UseInfiniteEventsQueryConfig = {}) => {
  const {
    eventType = 'upcoming',
    latitude,
    longitude,
    distance,
    userId,
    searchQuery,
    category,
    city,
    startDate,
    endDate,
    year,
    month,
    pageSize = 10,
    enableSmooth = true,
    keepPreviousData = true,
    refetchOnWindowFocus = true,
    enabled = true,
    staleTime = 1000 * 60 * 5, // 5 minutes
    gcTime = 1000 * 60 * 30, // 30 minutes
    refetchInterval = false,
    onSuccess,
    onError,
    onSettled,
  } = config;

  // Create stable query key
  const queryKey = useMemo(() => {
    const params = {
      latitude,
      longitude,
      distance,
      userId,
      searchQuery,
      category,
      city,
      startDate,
      endDate,
      year,
      month,
      pageSize,
    };
    
    // Use the appropriate query key based on event type
    switch (eventType) {
      case 'upcoming':
        return queryKeys.infiniteUpcoming(userId || '', params);
      case 'past':
        return queryKeys.infinitePast(userId || '', params);
      case 'attention-required':
        return queryKeys.infiniteEvents('attention-required', params);
      case 'nearby':
        return queryKeys.infiniteNearby(latitude || 0, longitude || 0, distance || 10, params);
      case 'friends':
        return queryKeys.infiniteFriends(userId || '', params);
      case 'recommended':
        return queryKeys.infiniteRecommended(userId || '', params);
      case 'search':
        return queryKeys.infiniteSearch(searchQuery || '', params);
      case 'user':
        return queryKeys.infiniteUser(userId || '', userId || '', params);
      case 'category':
        return queryKeys.infiniteEvents('category', { ...params, category: category || '' });
      case 'city':
        return queryKeys.infiniteEvents('city', { ...params, city: city || '' });
      default:
        return queryKeys.infiniteEvents(eventType, params);
    }
  }, [eventType, latitude, longitude, distance, userId, searchQuery, category, city, startDate, endDate, year, month, pageSize]);

  // Query function
  const queryFn = useCallback(async (context: QueryFunctionContext<readonly unknown[], number>) => {
    const { pageParam = 1 } = context;
    
    const apiFunction = eventsApiMap[eventType];
    
    if (!apiFunction) {
      throw new Error(`Unsupported event type: ${eventType}`);
    }

    const params = {
      page: pageParam,
      limit: pageSize,
      ...(latitude && { latitude }),
      ...(longitude && { longitude }),
      ...(distance && { distance }),
      ...(userId && { userId }),
      ...(searchQuery && { searchQuery }),
      ...(category && { category }),
      ...(city && { city }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(year !== undefined && { year }),
      ...(month !== undefined && { month }),
    };

    return await apiFunction(params);
  }, [eventType, pageSize, latitude, longitude, distance, userId, searchQuery, category, city, startDate, endDate, year, month]);

  // Infinite query
  const query = useInfiniteQuery<
    PaginatedEventsResponse,
    Error,
    InfiniteData<PaginatedEventsResponse>,
    readonly unknown[],
    number
  >({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    gcTime,
    refetchInterval,
    refetchOnWindowFocus,
    initialPageParam: 1,
    
    // Pagination configuration
    getNextPageParam: (lastPage: PaginatedEventsResponse, allPages: PaginatedEventsResponse[]) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length + 1;
    },
    
    getPreviousPageParam: (firstPage: PaginatedEventsResponse, allPages: PaginatedEventsResponse[]) => {
      if (allPages.length <= 1) return undefined;
      return allPages.length - 1;
    },
    
    // Keep previous data for smooth transitions
    placeholderData: keepPreviousData ? (previousData: InfiniteData<PaginatedEventsResponse, number> | undefined) => previousData : undefined,
    
    // Select for smooth data transformation - always present to avoid conditional hooks
    select: (data: InfiniteData<PaginatedEventsResponse>) => {
      if (!enableSmooth) {
        // Return original data when smooth mode is disabled
        return data;
      }
      
      let events = data.pages.flatMap(page => page.events);
      
      
      // Log for debugging friends events
      if (eventType === 'friends') {
        console.log('Select - Friends events before filter:', events.length, events);
        const validEvents = events.filter(event => event && event.creator);
        console.log('Select - Friends events after filter:', validEvents.length);
        events = validEvents;
      }
      
      const totalCount = data.pages[0]?.totalCount || 0;
      const hasMore = data.pages[data.pages.length - 1]?.hasMore || false;
      
      return {
        ...data,
        events,
        totalCount,
        hasMore,
        totalPages: data.pages.length,
      };
    },
  });

  // Handle callbacks after query is created
  const handleSuccess = useCallback((data: InfiniteData<PaginatedEventsResponse>) => {
    if (onSuccess && data.pages.length > 0) {
      onSuccess(data.pages[data.pages.length - 1]);
    }
  }, [onSuccess]);

  // Use effect to handle success callback
  React.useEffect(() => {
    if (query.isSuccess && query.data) {
      handleSuccess(query.data);
    }
  }, [query.isSuccess, query.data, handleSuccess]);

  // Use effect to handle error callback
  React.useEffect(() => {
    if (query.isError && query.error && onError) {
      onError(query.error);
    }
  }, [query.isError, query.error, onError]);

  // Use effect to handle settled callback
  React.useEffect(() => {
    if ((query.isSuccess || query.isError) && onSettled) {
      onSettled();
    }
  }, [query.isSuccess, query.isError, onSettled]);

  // Derived state
  const allEvents = useMemo(() => {
    let events = query.data?.pages.flatMap(page => page.events) || [];
    
    // Log events for debugging
    if (eventType === 'friends' && events.length > 0) {
      console.log('Friends events data:', events);
    }
    
    // Filter out events without creators for friends events
    if (eventType === 'friends') {
      const validEvents = events.filter(event => {
        if (!event || !event.creator) {
          console.warn('Friends event missing creator:', event);
          return false;
        }
        return true;
      });
      
      console.log(`Friends events: ${events.length} total, ${validEvents.length} with creators`);
      events = validEvents;
    }
    
    return events;
  }, [query.data, eventType]);

  const totalCount = useMemo(() => {
    return query.data?.pages[0]?.totalCount || 0;
  }, [query.data]);

  const hasMore = useMemo(() => {
    return query.data?.pages[query.data.pages.length - 1]?.hasMore || false;
  }, [query.data]);

  // Helper functions
  const loadMore = useCallback(() => {
    if (hasMore && !query.isFetchingNextPage) {
      return query.fetchNextPage();
    }
  }, [hasMore, query.isFetchingNextPage, query.fetchNextPage]);

  const loadPrevious = useCallback(() => {
    if (query.hasPreviousPage && !query.isFetchingPreviousPage) {
      return query.fetchPreviousPage();
    }
  }, [query.hasPreviousPage, query.isFetchingPreviousPage, query.fetchPreviousPage]);

  const refetch = useCallback(() => {
    return query.refetch();
  }, [query.refetch]);

  const reset = useCallback(() => {
    // In TanStack Query v5, we use queryClient.removeQueries instead of query.remove
    return query.refetch();
  }, [query]);

  // Return comprehensive query state
  return {
    // Data
    events: allEvents,
    totalCount,
    hasMore,
    totalPages: query.data?.pages.length || 0,
    
    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchingPreviousPage: query.isFetchingPreviousPage,
    isRefetching: query.isRefetching,
    
    // Error states
    error: query.error,
    isError: query.isError,
    
    // Success states
    isSuccess: query.isSuccess,
    isStale: query.isStale,
    
    // Pagination states
    hasPreviousPage: query.hasPreviousPage,
    hasNextPage: query.hasNextPage,
    
    // Actions
    loadMore,
    loadPrevious,
    refetch,
    reset,
    
    // Advanced states
    fetchStatus: query.fetchStatus,
    dataUpdatedAt: query.dataUpdatedAt,
    failureCount: query.failureCount,
    failureReason: query.failureReason,
    
    // Raw query object for advanced use cases
    query,
  };
};

// Pre-configured hooks for specific use cases
export const useInfiniteUpcomingEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> = {}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'upcoming' });
};

export const useInfinitePastEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> = {}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'past' });
};

export const useInfiniteNearbyEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> & {
  latitude: number;
  longitude: number;
  distance?: number;
}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'nearby' });
};

export const useInfiniteFriendsEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> = {}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'friends' });
};

export const useInfiniteRecommendedEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> = {}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'recommended' });
};

export const useInfiniteAttentionRequiredEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> = {}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'attention-required' });
};

export const useInfiniteSearchEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> & {
  searchQuery: string;
}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'search' });
};

export const useInfiniteUserEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> & {
  userId: string;
}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'user' });
};

export const useInfiniteCategoryEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> & {
  category: string;
}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'category' });
};

export const useInfiniteCityEventsQuery = (config: Omit<UseInfiniteEventsQueryConfig, 'eventType'> & {
  city: string;
}) => {
  return useInfiniteEventsQuery({ ...config, eventType: 'city' });
};

// Re-export the config interface with a different name to avoid conflicts
export type { UseInfiniteEventsQueryConfig as InfiniteEventsQueryConfig };

// Export Event type separately to avoid conflicts
export type { Event as InfiniteEvent };