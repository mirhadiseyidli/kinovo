import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useCalendarEventsQuery } from './useCalendarEventsQuery';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';
import { 
  EventOccurrence, 
  RecurringEventModification, 
  expandRecurringEvent,
  groupOccurrencesByDate,
  getOccurrencesForDate,
  getOccurrencesForDateRange
} from '@/utils/eventUtils';
import { useMemo } from 'react';
import { parseISO, format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TanStack Query hook for processing event occurrences
 * 
 * This hook replaces the EventContext's expandEventsToOccurrences function
 * and provides TanStack Query caching for the expanded occurrences.
 * 
 * Key features:
 * - Processes recurring events into individual occurrences
 * - Applies recurring event modifications
 * - Caches expanded occurrences with TanStack Query
 * - Supports date range filtering
 * - Memory-efficient with cache limits
 */

interface UseEventOccurrencesQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

interface EventOccurrencesResult {
  occurrences: EventOccurrence[];
  loading: boolean;
  error: Error | null;
  getOccurrencesForDate: (date: Date) => EventOccurrence[];
  getOccurrencesForDateRange: (startDate: Date, endDate: Date) => EventOccurrence[];
  groupedByDate: Record<string, EventOccurrence[]>;
  invalidateOccurrences: () => void;
  refreshOccurrences: () => Promise<void>;
}

export const useEventOccurrencesQuery = (
  startDate: Date,
  endDate: Date,
  options: UseEventOccurrencesQueryOptions = {}
): EventOccurrencesResult => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Get raw events from calendar query
  const { 
    events: rawEvents, 
    loading: eventsLoading, 
    error: eventsError 
  } = useCalendarEventsQuery(startDate, endDate, {
    enabled,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus
  });

  // Generate stable query key for occurrences
  const occurrencesQueryKey = useMemo(
    () => queryKeys.calendarOccurrences(startDate, endDate),
    [startDate, endDate]
  );

  // Query for cached modifications
  const modificationsQuery = useQuery({
    queryKey: ['recurring-event-modifications', userId],
    queryFn: async (): Promise<RecurringEventModification[]> => {
      try {
        const cached = await AsyncStorage.getItem('eventModifications');
        if (cached) {
          const modifications = JSON.parse(cached).map((mod: any) => ({
            ...mod,
            occurrenceDate: new Date(mod.occurrenceDate)
          }));
          return modifications;
        }
        return [];
      } catch (error) {
        console.error('Error loading cached modifications:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - modifications don't change often
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Main occurrences query that processes events into occurrences
  const occurrencesQuery = useQuery({
    queryKey: occurrencesQueryKey,
    queryFn: async (): Promise<EventOccurrence[]> => {
      // Early return if no events to process
      if (!rawEvents || rawEvents.length === 0) {
        return [];
      }

      const modifications = modificationsQuery.data || [];
      
      // Process each event into occurrences
      const allOccurrences: EventOccurrence[] = [];
      
      rawEvents.forEach(event => {
        // If this event is already a recurring occurrence from the backend, convert it directly
        if (event.isRecurringOccurrence && event.originalEventId) {
          // Create an EventOccurrence for this already-expanded event
          const eventDate = typeof event.start_time === 'string' ? parseISO(event.start_time) : event.start_time;
          if (eventDate && eventDate >= startDate && eventDate <= endDate) {
            allOccurrences.push({
              id: event._id || `${event.originalEventId}-${format(eventDate, 'yyyy-MM-dd')}`,
              originalEventId: event.originalEventId,
              date: eventDate,
              event,
              isModified: false,
              isCancelled: false
            });
          }
        } else {
          // For original recurring events (master docs): skip expansion if server already supplied occurrences
          const occurrencesExist = rawEvents.some(e => e.isRecurringOccurrence && e.originalEventId === event._id);

          if (!occurrencesExist) {
            const occurrences = expandRecurringEvent(event, startDate, endDate, modifications);
            allOccurrences.push(...occurrences);
          }
        }
      });

      // Sort by date for consistent ordering
      return allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    enabled: enabled && !!rawEvents && !eventsLoading && !modificationsQuery.isLoading,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus,
    
    // Performance optimizations
    structuralSharing: true,
    
    // Network mode for offline support
    networkMode: 'offlineFirst'
  });

  // Memoized helper functions
  const getOccurrencesForDateFunc = useMemo(() => {
    return (date: Date): EventOccurrence[] => {
      if (!occurrencesQuery.data) return [];
      return getOccurrencesForDate(occurrencesQuery.data, date);
    };
  }, [occurrencesQuery.data]);

  const getOccurrencesForDateRangeFunc = useMemo(() => {
    return (rangeStartDate: Date, rangeEndDate: Date): EventOccurrence[] => {
      if (!occurrencesQuery.data) return [];
      return getOccurrencesForDateRange(occurrencesQuery.data, rangeStartDate, rangeEndDate);
    };
  }, [occurrencesQuery.data]);

  // Memoized grouped occurrences
  const groupedByDate = useMemo(() => {
    if (!occurrencesQuery.data) return {};
    return groupOccurrencesByDate(occurrencesQuery.data);
  }, [occurrencesQuery.data]);

  // Helper function to invalidate occurrences queries
  const invalidateOccurrences = () => {
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.all, 'calendar-occurrences'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.all, 'calendar-range'] 
    });
  };

  // Helper function to refresh occurrences
  const refreshOccurrences = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: occurrencesQueryKey }),
      queryClient.refetchQueries({ queryKey: ['recurring-event-modifications', userId] })
    ]);
  };

  return {
    occurrences: occurrencesQuery.data || [],
    loading: eventsLoading || occurrencesQuery.isPending || modificationsQuery.isPending,
    error: eventsError || occurrencesQuery.error || modificationsQuery.error,
    getOccurrencesForDate: getOccurrencesForDateFunc,
    getOccurrencesForDateRange: getOccurrencesForDateRangeFunc,
    groupedByDate,
    invalidateOccurrences,
    refreshOccurrences
  };
};

/**
 * Hook specifically for calendar month views with occurrences
 * Extends date range to include surrounding weeks for better UX
 */
export const useCalendarMonthOccurrencesQuery = (
  month: number,
  year: number,
  options: UseEventOccurrencesQueryOptions = {}
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

  return useEventOccurrencesQuery(startDate, endDate, {
    ...options,
    // Month view has longer stale time since it's more stable
    staleTime: options.staleTime || 10 * 60 * 1000 // 10 minutes
  });
};

/**
 * Hook specifically for calendar week views with occurrences
 */
export const useCalendarWeekOccurrencesQuery = (
  date: Date,
  options: UseEventOccurrencesQueryOptions = {}
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

  return useEventOccurrencesQuery(startDate, endDate, {
    ...options,
    // Week view has shorter stale time since it changes more frequently
    staleTime: options.staleTime || 3 * 60 * 1000 // 3 minutes
  });
};