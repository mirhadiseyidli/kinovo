import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { getCalendarEventsForDateRange } from '@/utils/queryFunctions';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';
import { useMemo } from 'react';

/**
 * TanStack Query hook for calendar events within a date range
 * 
 * This hook replaces the EventContext's fetchEventsFromAPI function
 * and provides the same caching behavior but with TanStack Query's
 * superior cache management.
 * 
 * Key features:
 * - Date range based caching
 * - Force refresh capability
 * - Automatic cache invalidation
 * - Security: Only returns events where user is an attendee
 */

interface UseCalendarEventsQueryOptions {
  enabled?: boolean;
  forceRefresh?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

export const useCalendarEventsQuery = (
  startDate: Date,
  endDate: Date,
  options: UseCalendarEventsQueryOptions = {}
) => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    forceRefresh = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Generate stable query key
  const queryKey = useMemo(
    () => queryKeys.calendarEventsForDateRange(startDate, endDate, forceRefresh),
    [startDate, endDate, forceRefresh]
  );

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const events = await getCalendarEventsForDateRange(startDate, endDate, forceRefresh);
      
      // SECURITY: Filter to only events where user is an attendee (matches EventContext behavior)
      if (!userId) return [];
      
      return events.filter((event: Event) => {
        if (!event.attendees) return false;
        
        return event.attendees.some((attendee: { user: any; status: string }) => {
          const attendeeId = attendee.user._id || attendee.user;
          return attendeeId.toString() === userId.toString();
        });
      });
    },
    enabled: enabled && !!userId,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus,
    
    // Performance optimizations
    structuralSharing: true,
    
    // Force fresh data when forceRefresh is true
    refetchOnReconnect: forceRefresh,
    
    // Network mode for offline support
    networkMode: 'offlineFirst'
  });

  // Helper function to invalidate calendar queries (used by mutations)
  const invalidateCalendarQueries = () => {
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.all, 'calendar-range'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.all, 'calendar'] 
    });
  };

  // Helper function to check if date range is cached
  const isDateRangeCached = (checkStartDate: Date, checkEndDate: Date): boolean => {
    const cachedData = queryClient.getQueriesData({ 
      queryKey: [...queryKeys.all, 'calendar-range'] 
    });
    
    return cachedData.some(([key, data]) => {
      if (!data || !Array.isArray(key)) return false;
      
      // Extract date parameters from the query key
      const keyParams = key.find(item => 
        typeof item === 'object' && item !== null && 'start' in item && 'end' in item
      ) as { start: string; end: string } | undefined;
      
      if (!keyParams) return false;
      
      const cachedStart = new Date(keyParams.start);
      const cachedEnd = new Date(keyParams.end);
      
      // Check if the requested range is within the cached range
      return cachedStart <= checkStartDate && cachedEnd >= checkEndDate;
    });
  };

  return {
    ...query,
    events: query.data || [],
    invalidateCalendarQueries,
    isDateRangeCached,
    // Expose loading/error states with same names as EventContext
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending
  };
};

/**
 * Hook specifically for calendar month views
 * Extends date range to include surrounding weeks for better UX
 */
export const useCalendarMonthEventsQuery = (
  month: number,
  year: number,
  options: UseCalendarEventsQueryOptions = {}
) => {
  const startDate = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // Extend to include previous month's days that appear in the calendar grid
    const startOfWeekDate = new Date(firstDay);
    startOfWeekDate.setDate(firstDay.getDate() - firstDay.getDay());
    // Extend further back for better caching
    startOfWeekDate.setDate(startOfWeekDate.getDate() - 14);
    return startOfWeekDate;
  }, [month, year]);

  const endDate = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0);
    // Extend to include next month's days that appear in the calendar grid
    const endOfWeekDate = new Date(lastDay);
    endOfWeekDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    // Extend further forward for better caching
    endOfWeekDate.setDate(endOfWeekDate.getDate() + 14);
    return endOfWeekDate;
  }, [month, year]);

  return useCalendarEventsQuery(startDate, endDate, {
    ...options,
    // Month view has longer stale time since it's more stable
    staleTime: options.staleTime || 10 * 60 * 1000 // 10 minutes
  });
};

/**
 * Hook specifically for calendar week views
 */
export const useCalendarWeekEventsQuery = (
  date: Date,
  options: UseCalendarEventsQueryOptions = {}
) => {
  const { startDate, endDate } = useMemo(() => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    // Extend to include previous and next week
    const extendedStart = new Date(startOfWeek);
    extendedStart.setDate(startOfWeek.getDate() - 7);
    
    const endOfWeek = new Date(date);
    endOfWeek.setDate(date.getDate() + (6 - date.getDay()));
    // Extend to include next week
    const extendedEnd = new Date(endOfWeek);
    extendedEnd.setDate(endOfWeek.getDate() + 7);
    
    return { startDate: extendedStart, endDate: extendedEnd };
  }, [date]);

  return useCalendarEventsQuery(startDate, endDate, {
    ...options,
    // Week view has shorter stale time since it changes more frequently
    staleTime: options.staleTime || 3 * 60 * 1000 // 3 minutes
  });
};