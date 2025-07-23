import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { queryFunctions } from '@/utils/queryFunctions';
import { 
  selectEventsForCalendar, 
  selectEventsGroupedByDate, 
  selectEventsForSearch,
  createPlaceholderData,
  shouldKeepPreviousData 
} from '@/utils/smoothUIHelpers';
import { Event } from '@/types/allTypes';
import { useMemo } from 'react';

// Extended Event interface for location-based queries
interface EventWithLocation extends Event {
  distanceFromUser?: number;
  isNearby?: boolean;
  lat?: number;
  lng?: number;
}

// Extended Event interface for time-based queries
interface EventWithTimeInfo extends Event {
  timeAgo?: string;
  isPastEvent?: boolean;
}

/**
 * Collection of hooks demonstrating smooth UI patterns
 * These hooks showcase different combinations of select, placeholderData, and keepPreviousData
 */

/**
 * Hook for calendar events with smooth transitions
 * Uses select to transform events to calendar format
 */
export const useCalendarEventsQuery = (month: number, year: number) => {
  const { userId } = useAuthSession();
  
  const selectCalendarData = useMemo(() => 
    (data: Event[]) => selectEventsForCalendar(data), 
    []
  );

  return useQuery({
    queryKey: queryKeys.calendarEvents(userId || '', month, year),
    queryFn: queryFunctions.calendarEvents(userId || '', month, year),
    enabled: Boolean(userId),
    
    // Transform data for calendar without causing re-renders
    select: selectCalendarData,
    
    // Keep previous month's data visible while loading new month
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes for calendar data
  });
};

/**
 * Hook for events grouped by date with smooth scrolling
 * Uses select to group events by date for SectionList
 */
export const useGroupedEventsQuery = (fromHomeScreen = false) => {
  const { userId } = useAuthSession();
  
  const selectGroupedData = useMemo(() => 
    (data: Event[]) => selectEventsGroupedByDate(data), 
    []
  );

  return useQuery({
    queryKey: queryKeys.upcomingEvents(userId || '', fromHomeScreen),
    queryFn: queryFunctions.upcomingEvents(userId || '', fromHomeScreen),
    enabled: Boolean(userId),
    
    // Group events by date without re-renders
    select: selectGroupedData,
    
    // Keep previous grouped data during refresh
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

/**
 * Hook for search with smooth results updates
 * Uses select to highlight search terms and sort by relevance
 */
export const useSearchEventsQuery = (searchTerm: string, enabled = true) => {
  const selectSearchData = useMemo(() => 
    (data: Event[]) => selectEventsForSearch(data, searchTerm), 
    [searchTerm]
  );

  return useQuery({
    queryKey: queryKeys.searchEvents(searchTerm),
    queryFn: queryFunctions.searchEvents(searchTerm),
    enabled: enabled && Boolean(searchTerm?.trim()),
    
    // Transform and highlight search results
    select: selectSearchData,
    
    // Keep previous search results visible while searching
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 1, // 1 minute for search
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook for nearby events with location-based smooth updates
 * Demonstrates keepPreviousData with location changes
 */
export const useNearbyEventsQuery = (
  lat: number, 
  lng: number, 
  distance: number = 5000
) => {
  const stableQueryKey = queryKeys.nearbyEvents(lat, lng, distance);
  
  return useQuery<Event[], Error, EventWithLocation[]>({
    queryKey: stableQueryKey,
    queryFn: queryFunctions.nearbyEvents(lat, lng, distance),
    enabled: Boolean(lat && lng),
    
    // Transform for display with location info
    select: (data: Event[]) => data.map(event => ({
      ...event,
      distanceFromUser: calculateDistance(
        lat, 
        lng, 
        event.location?.coordinates?.lat || 0, 
        event.location?.coordinates?.lng || 0
      ),
      isNearby: true,
      lat: event.location?.coordinates?.lat || undefined,
      lng: event.location?.coordinates?.lng || undefined,
    })),
    
    // Keep previous location's events while loading new location
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 3, // 3 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Hook for past events with pagination and smooth loading
 * Demonstrates placeholderData with pagination
 */
export const usePastEventsQuery = (year?: number, month?: number) => {
  const { userId } = useAuthSession();
  
  return useQuery<Event[], Error, EventWithTimeInfo[]>({
    queryKey: queryKeys.pastEvents(userId || '', year, month),
    queryFn: queryFunctions.pastEvents(userId || '', year, month),
    enabled: Boolean(userId),
    
    // Transform for timeline display
    select: (data: Event[]) => data.map(event => ({
      ...event,
      timeAgo: getTimeAgo(event.start_time || new Date()),
      isPastEvent: true,
    })),
    
    // Keep previous month's data while loading new month
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 10, // 10 minutes (past events change rarely)
    gcTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Hook demonstrating complex select transformations
 * Shows how to create derived state without causing re-renders
 */
export const useEventAnalyticsQuery = () => {
  const { userId } = useAuthSession();
  
  const selectAnalyticsData = useMemo(() => 
    (data: Event[]) => {
      if (!data || data.length === 0) return null;
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      return {
        totalEvents: data.length,
        thisMonth: data.filter(event => 
          event.start_time && new Date(event.start_time) >= thisMonth
        ).length,
        lastMonth: data.filter(event => {
          if (!event.start_time) return false;
          const eventDate = new Date(event.start_time);
          return eventDate >= lastMonth && eventDate < thisMonth;
        }).length,
        byCategory: data.reduce((acc, event) => {
          const category = event.category || 'uncategorized';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        upcoming: data.filter(event => 
          event.start_time && new Date(event.start_time) > now
        ).length,
        past: data.filter(event => 
          event.start_time && new Date(event.start_time) <= now
        ).length,
        averagePerWeek: Math.round(data.length / 4), // Rough estimate
      };
    }, 
    []
  );

  return useQuery({
    queryKey: queryKeys.userEvents(userId || ''),
    queryFn: queryFunctions.upcomingEvents(userId || ''), // Get all events
    enabled: Boolean(userId),
    
    // Transform to analytics without re-renders
    select: selectAnalyticsData,
    
    // Keep previous analytics while updating
    placeholderData: keepPreviousData,
    
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
};

/**
 * Helper functions
 */

// Calculate distance between two points (simplified)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  // Handle invalid coordinates
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get time ago string
const getTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const eventDate = new Date(date);
  const diffMs = now.getTime() - eventDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

/**
 * Custom hook for managing smooth UI state across multiple queries
 */
export const useSmoothUIState = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  
  // Get loading states for all queries
  const upcomingQuery = queryClient.getQueryState(queryKeys.upcomingEvents(userId || '', false));
  const calendarQuery = queryClient.getQueryState(queryKeys.calendarEvents(userId || '', new Date().getMonth() + 1, new Date().getFullYear()));
  
  // In TanStack Query v5, status values are: 'pending', 'error', 'success'
  const isAnyLoading = upcomingQuery?.status === 'pending' || calendarQuery?.status === 'pending';
  
  // Check fetching state from QueryState (fetchStatus is available on QueryState)
  const isAnyFetching = upcomingQuery?.fetchStatus === 'fetching' || calendarQuery?.fetchStatus === 'fetching';
  const isAnyError = upcomingQuery?.status === 'error' || calendarQuery?.status === 'error';
  
  return {
    isAnyLoading,
    isAnyFetching,
    isAnyError,
    isTransitioning: isAnyFetching && !isAnyLoading,
    
    // Helper methods
    invalidateAllQueries: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.userEvents(userId || '') });
    },
    
    prefetchUpcomingEvents: () => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.upcomingEvents(userId || '', false),
        queryFn: queryFunctions.upcomingEvents(userId || '', false),
      });
    },
  };
};