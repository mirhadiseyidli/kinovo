import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

/**
 * Infinite Query Utilities
 * 
 * This module provides utility functions for working with infinite queries,
 * including cache invalidation, prefetching, and data manipulation.
 */

export interface InfiniteQueryInvalidationOptions {
  queryClient: QueryClient;
  eventType?: 'upcoming' | 'past' | 'nearby' | 'friends' | 'recommended' | 'search' | 'user';
  userId?: string;
  exact?: boolean;
}

export interface InfinitePrefetchOptions {
  queryClient: QueryClient;
  eventType: 'upcoming' | 'past' | 'nearby' | 'friends' | 'recommended' | 'search' | 'user';
  userId?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  searchQuery?: string;
  pageSize?: number;
  staleTime?: number;
}

/**
 * Invalidate infinite queries
 */
export const invalidateInfiniteQueries = ({
  queryClient,
  eventType,
  userId,
  exact = false,
}: InfiniteQueryInvalidationOptions) => {
  if (eventType && exact) {
    // Invalidate specific event type
    queryClient.invalidateQueries({
      queryKey: queryKeys.invalidation.infiniteQueriesByType(eventType),
    });
  } else if (eventType) {
    // Invalidate all queries for event type (less specific)
    queryClient.invalidateQueries({
      queryKey: queryKeys.invalidation.infiniteQueriesByType(eventType),
      exact: false,
    });
  } else if (userId) {
    // Invalidate all user-related infinite queries
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.all, 'infinite'],
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.includes(userId);
      },
    });
  } else {
    // Invalidate all infinite queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.invalidation.allInfiniteQueries(),
    });
  }
};

/**
 * Prefetch infinite queries
 */
export const prefetchInfiniteQuery = async ({
  queryClient,
  eventType,
  userId,
  latitude,
  longitude,
  distance,
  searchQuery,
  pageSize = 10,
  staleTime = 1000 * 60 * 5, // 5 minutes
}: InfinitePrefetchOptions) => {
  
  // Build query key based on event type
  let queryKey: any;
  
  switch (eventType) {
    case 'upcoming':
      queryKey = queryKeys.infiniteUpcoming(userId || '', { pageSize });
      break;
    case 'past':
      queryKey = queryKeys.infinitePast(userId || '', { pageSize });
      break;
    case 'nearby':
      queryKey = queryKeys.infiniteNearby(latitude || 0, longitude || 0, distance || 10, { pageSize });
      break;
    case 'friends':
      queryKey = queryKeys.infiniteFriends(userId || '', { pageSize });
      break;
    case 'recommended':
      queryKey = queryKeys.infiniteRecommended(userId || '', { pageSize });
      break;
    case 'search':
      queryKey = queryKeys.infiniteSearch(searchQuery || '', { pageSize });
      break;
    case 'user':
      queryKey = queryKeys.infiniteUser(userId || '', userId || '', { pageSize });
      break;
    default:
      queryKey = queryKeys.infiniteEvents(eventType, { pageSize });
  }

  // Prefetch the query
  await queryClient.prefetchInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      // Import API client dynamically
      const api = (await import('./api')).default;
      
      const params = {
        page: pageParam,
        limit: pageSize,
        ...(latitude && { lat: latitude }),
        ...(longitude && { lng: longitude }),
        ...(distance && { distance }),
        ...(searchQuery && { q: searchQuery }),
      };

      const apiEndpoints = {
        upcoming: '/api/manageevents/eventslist/get/my/upcoming/events',
        past: '/api/manageevents/eventslist/get/my/past/events',
        nearby: '/api/manageevents/eventslist/get/nearby/events',
        friends: '/api/manageevents/eventslist/friends',
        recommended: '/api/manageevents/eventslist/get/recommended',
        search: '/api/search/events',
        user: `/api/manageevents/eventslist/get/user/${userId}`,
      };

      const response = await api.get(apiEndpoints[eventType], { params });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    staleTime,
  });
};

/**
 * Get infinite query data
 */
export const getInfiniteQueryData = (
  queryClient: QueryClient,
  eventType: string,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  return queryClient.getQueryData(queryKey);
};

/**
 * Set infinite query data
 */
export const setInfiniteQueryData = (
  queryClient: QueryClient,
  eventType: string,
  data: any,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  queryClient.setQueryData(queryKey, data);
};

/**
 * Remove infinite query data
 */
export const removeInfiniteQueryData = (
  queryClient: QueryClient,
  eventType: string,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  queryClient.removeQueries({ queryKey });
};

/**
 * Cancel infinite queries
 */
export const cancelInfiniteQueries = async (
  queryClient: QueryClient,
  eventType?: string
) => {
  if (eventType) {
    await queryClient.cancelQueries({
      queryKey: queryKeys.invalidation.infiniteQueriesByType(eventType),
    });
  } else {
    await queryClient.cancelQueries({
      queryKey: queryKeys.invalidation.allInfiniteQueries(),
    });
  }
};

/**
 * Reset infinite queries
 */
export const resetInfiniteQueries = (
  queryClient: QueryClient,
  eventType?: string
) => {
  if (eventType) {
    queryClient.resetQueries({
      queryKey: queryKeys.invalidation.infiniteQueriesByType(eventType),
    });
  } else {
    queryClient.resetQueries({
      queryKey: queryKeys.invalidation.allInfiniteQueries(),
    });
  }
};

/**
 * Refetch infinite queries
 */
export const refetchInfiniteQueries = async (
  queryClient: QueryClient,
  eventType?: string
) => {
  if (eventType) {
    return queryClient.refetchQueries({
      queryKey: queryKeys.invalidation.infiniteQueriesByType(eventType),
    });
  } else {
    return queryClient.refetchQueries({
      queryKey: queryKeys.invalidation.allInfiniteQueries(),
    });
  }
};

/**
 * Get infinite query state
 */
export const getInfiniteQueryState = (
  queryClient: QueryClient,
  eventType: string,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  return queryClient.getQueryState(queryKey);
};

/**
 * Utility to merge infinite query pages
 */
export const mergeInfiniteQueryPages = (oldData: any, newData: any) => {
  if (!oldData) return newData;
  
  return {
    ...newData,
    pages: [...oldData.pages, ...newData.pages],
    pageParams: [...oldData.pageParams, ...newData.pageParams],
  };
};

/**
 * Utility to update infinite query cache with new item
 */
export const updateInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  newEvent: any,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any, pageIndex: number) => {
      // Add to first page
      if (pageIndex === 0) {
        return {
          ...page,
          events: [newEvent, ...page.events],
          totalCount: page.totalCount + 1,
        };
      }
      return page;
    });
    
    return {
      ...oldData,
      pages: newPages,
    };
  });
};

/**
 * Utility to remove item from infinite query cache
 */
export const removeFromInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  eventId: string,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      events: page.events.filter((event: any) => event.id !== eventId),
      totalCount: Math.max(0, page.totalCount - 1),
    }));
    
    return {
      ...oldData,
      pages: newPages,
    };
  });
};

/**
 * Utility to update item in infinite query cache
 */
export const updateInfiniteQueryCacheItem = (
  queryClient: QueryClient,
  eventType: string,
  eventId: string,
  updatedEvent: any,
  userId?: string,
  params: Record<string, any> = {}
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId, ...params });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      events: page.events.map((event: any) => 
        event.id === eventId ? { ...event, ...updatedEvent } : event
      ),
    }));
    
    return {
      ...oldData,
      pages: newPages,
    };
  });
};

/**
 * Development helpers
 */
if (__DEV__) {
  (global as any).__INFINITE_QUERY_UTILS__ = {
    invalidateInfiniteQueries,
    prefetchInfiniteQuery,
    getInfiniteQueryData,
    setInfiniteQueryData,
    removeInfiniteQueryData,
    cancelInfiniteQueries,
    resetInfiniteQueries,
    refetchInfiniteQueries,
    getInfiniteQueryState,
    mergeInfiniteQueryPages,
    updateInfiniteQueryCache,
    removeFromInfiniteQueryCache,
    updateInfiniteQueryCacheItem,
  };
}