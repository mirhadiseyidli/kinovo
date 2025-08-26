import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { useCategoryEvents, useCityEvents } from './useEvents';

interface InfiniteEventsParams {
  pageSize?: number;
  searchQuery?: string;
  category?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  distance?: number;
  userId?: string;
  year?: number;
  month?: number;
  _id?: string;
  from_home_screen?: boolean;
}

// Generic infinite events hook
const useInfiniteEvents = (
  queryType: string,
  endpoint: string,  
  params: InfiniteEventsParams = {},
  options?: { enabled?: boolean }
) => {
  const { pageSize = 10, ...otherParams } = params;
  
  return useInfiniteQuery({
    queryKey: ['events', 'infinite', queryType, pageSize, otherParams],
    queryFn: async ({ pageParam = 1 }) => {
      try {
        const response = await api.get(endpoint, {
          params: { 
            page: pageParam, 
            limit: pageSize,
            ...otherParams 
          }
        });
        
        // Handle null/undefined response
        if (!response || !response.data) {
          return {
            events: [],
            totalCount: 0,
            hasMore: false,
            currentPage: 1,
            totalPages: 1,
          };
        }
        
        // Handle both paginated and array responses
        if (Array.isArray(response.data)) {
          return {
            events: response.data,
            totalCount: response.data.length,
            hasMore: false,
            currentPage: 1,
            totalPages: 1,
          };
        }
        
        // Ensure response.data has the expected structure
        return {
          events: response.data.events || [],
          totalCount: response.data.totalCount || 0,
          hasMore: response.data.hasMore || false,
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1,
        };
      } catch (error) {
        console.error(`Error fetching ${queryType} events:`, error);
        // Always throw the error to let React Query handle it
        // This ensures cached data is shown and error context is triggered
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
    enabled: options?.enabled !== false,
    // Cache-first with background refresh configuration
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Disabled for mobile - users frequently switch apps
    refetchOnMount: true, // Changed from 'always' to true for proper cache-first behavior
    networkMode: 'offlineFirst',
    // Retry configuration
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Specific infinite query hooks
export const useInfiniteUpcomingEvents = (pageSize: number = 10, fromHomeScreen: boolean = true) => {
  return useInfiniteEvents(
    'upcoming',
    '/api/manageevents/eventslist/get/my/upcoming/events',
    { pageSize, from_home_screen: fromHomeScreen }
  );
};

export const useInfinitePastEvents = (
  pageSize: number = 10,
  filters?: { year?: number; month?: number }
) => {
  return useInfiniteEvents(
    'past',
    '/api/manageevents/eventslist/get/my/past/events',
    { pageSize, ...filters }
  );
};

export const useInfiniteNearbyEvents = (
  latitude: number,
  longitude: number,
  distance: number = 50,
  pageSize: number = 10
) => {
  return useInfiniteEvents(
    'nearby',
    '/api/manageevents/eventslist/get/nearby/events',
    { pageSize, lat: latitude, lng: longitude, distance },
    { enabled: !!latitude && !!longitude }
  );
};

export const useInfiniteFriendsEvents = (pageSize: number = 10) => {
  return useInfiniteEvents(
    'friends',
    '/api/manageevents/eventslist/friends',
    { pageSize }
  );
};

export const useInfiniteSearchEvents = (
  searchQuery: string, 
  pageSize: number = 10
) => {
  return useInfiniteEvents(
    'search',
    '/api/search/events',
    { pageSize, searchQuery },
    { enabled: !!searchQuery.trim() }
  );
};

export const useInfiniteUserEvents = (
  targetUserId: string, 
  pageSize: number = 10
) => {
  return useInfiniteEvents(
    'user',
    '/api/manageevents/eventslist/get/user/events',
    { pageSize, _id: targetUserId },
    { enabled: !!targetUserId }
  );
};

export const useInfiniteCategoryEvents = (
  category: string, 
  pageSize: number = 10
) => {
  // Use the store-based hook instead of separate API calls
  const { data: allEvents = [], ...query } = useCategoryEvents(category);
  
  return useMemo(() => {
    // Convert to infinite query format
    const totalEvents = allEvents;
    const pages = [];
    
    for (let i = 0; i < totalEvents.length; i += pageSize) {
      const pageEvents = totalEvents.slice(i, i + pageSize);
      pages.push({
        events: pageEvents,
        totalCount: totalEvents.length,
        hasMore: i + pageSize < totalEvents.length,
        currentPage: Math.floor(i / pageSize) + 1,
        totalPages: Math.ceil(totalEvents.length / pageSize),
      });
    }
    
    return {
      ...query,
      data: { pages },
      hasNextPage: pages.length > 1,
      fetchNextPage: () => Promise.resolve(), // Not needed for store-based approach
      isFetchingNextPage: false,
    };
  }, [allEvents, pageSize, query]);
};

export const useInfiniteCityEvents = (
  city: string, 
  pageSize: number = 10
) => {
  // Use the store-based hook instead of separate API calls
  const { data: allEvents = [], ...query } = useCityEvents(city);
  
  return useMemo(() => {
    // Convert to infinite query format
    const totalEvents = allEvents;
    const pages = [];
    
    for (let i = 0; i < totalEvents.length; i += pageSize) {
      const pageEvents = totalEvents.slice(i, i + pageSize);
      pages.push({
        events: pageEvents,
        totalCount: totalEvents.length,
        hasMore: i + pageSize < totalEvents.length,
        currentPage: Math.floor(i / pageSize) + 1,
        totalPages: Math.ceil(totalEvents.length / pageSize),
      });
    }
    
    return {
      ...query,
      data: { pages },
      hasNextPage: pages.length > 1,
      fetchNextPage: () => Promise.resolve(), // Not needed for store-based approach
      isFetchingNextPage: false,
    };
  }, [allEvents, pageSize, query]);
};

export const useInfiniteRecommendedEvents = (pageSize: number = 10) => {
  return useInfiniteEvents(
    'recommended',
    '/api/manageevents/eventslist/get/recommended',
    { pageSize }
  );
};

export const useInfiniteAttentionRequiredEvents = (pageSize: number = 10, fromHomeScreen: boolean = false) => {
  return useInfiniteEvents(
    'attention-required',
    '/api/manageevents/eventslist/get/attention/required',
    { pageSize, from_home_screen: fromHomeScreen }
  );
};