import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { Event } from '@/types/allTypes';
import { EventOccurrence, expandRecurringEvent } from '@/utils/eventUtils';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  format,
  isWithinInterval
} from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

interface OptimalCalendarQueryOptions {
  staleTime?: number;
}

interface OptimalCalendarQueryResult {
  events: Event[];
  occurrences: EventOccurrence[];
  loading: boolean;
  refreshing: boolean;
  eventsError: boolean;
  occurrencesError: boolean;
  hasAnyError: boolean;
  eventsErrorObject: any;
  occurrencesErrorObject: any;
  refetch: () => Promise<any>;
  refreshOccurrences: () => Promise<any>;
  invalidateCalendarQueries: () => void;
  invalidateOccurrences: () => void;
  getOccurrencesForDate: (date: Date) => EventOccurrence[];
  getOccurrencesForDateRange: (startDate: Date, endDate: Date) => EventOccurrence[];
  groupedByDate: Record<string, EventOccurrence[]>;
}

// Helper to calculate date range based on view
const getDateRangeForView = (date: Date, view: 'Month' | 'Week' | 'Schedule') => {
  switch (view) {
    case 'Month': {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      // Extend to include surrounding weeks for calendar grid
      const extendedStart = startOfWeek(subWeeks(start, 2));
      const extendedEnd = endOfWeek(addWeeks(end, 2));
      return { startDate: extendedStart, endDate: extendedEnd };
    }
    case 'Week': {
      // Extend to include previous and next week
      const extendedStart = startOfWeek(subWeeks(date, 1));
      const extendedEnd = endOfWeek(addWeeks(date, 1));
      return { startDate: extendedStart, endDate: extendedEnd };
    }
    case 'Schedule': {
      // For schedule view, get current month plus/minus one month
      const start = startOfMonth(subMonths(date, 1));
      const end = endOfMonth(addMonths(date, 1));
      return { startDate: start, endDate: end };
    }
    default:
      return { startDate: new Date(), endDate: new Date() };
  }
};

export const useOptimalCalendarQuery = (
  currentDate: Date,
  currentView: 'Month' | 'Week' | 'Schedule',
  options: OptimalCalendarQueryOptions = {}
): OptimalCalendarQueryResult => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();

  // Memoize query configuration
  const queryConfig = useMemo(() => {
    const { startDate, endDate } = getDateRangeForView(currentDate, currentView);
    const staleTime = options.staleTime || (
      currentView === 'Month' ? 10 * 60 * 1000 : 
      currentView === 'Week' ? 3 * 60 * 1000 : 
      5 * 60 * 1000
    );

    // Create unified query key using existing queryKeys structure
    const queryKey = currentView === 'Month' 
      ? queryKeys.calendarEvents(userId || 'anonymous', currentDate.getMonth(), currentDate.getFullYear())
      : queryKeys.calendarRange(userId || 'anonymous', startDate.toISOString(), endDate.toISOString());

    const occurrenceKey = queryKeys.calendarOccurrences(startDate, endDate);

    return {
      startDate,
      endDate,
      staleTime,
      queryKey,
      occurrenceKey,
      view: currentView,
    };
  }, [currentDate, currentView, options.staleTime, userId]);

  // Single events query
  const eventsQuery = useQuery({
    queryKey: queryConfig.queryKey,
    queryFn: async () => {
      let events: Event[];
      
      if (queryConfig.view === 'Month') {
        events = await eventApi.getCalendarEvents(userId || 'anonymous', currentDate.getMonth(), currentDate.getFullYear());
      } else {
        events = await eventApi.getCalendarRange(userId || 'anonymous', queryConfig.startDate.toISOString(), queryConfig.endDate.toISOString());
      }
      
      // The server already provides userStatus for calendar events, no client processing needed
      return events;
    },
    staleTime: queryConfig.staleTime,
    gcTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!userId, // Only run when we have a user
  });

  // Single occurrences query
  const occurrences = useMemo(() => {
    const events = eventsQuery.data || [];
    console.log('🔄 Occurrences useMemo Recalculating from updated events:', {
      eventsCount: events.length,
      view: queryConfig.view,
      sampleEvent: events.find(e => e.title === 'Calendar')
    });
    
    if (!events.length) return [];

    // Handle mixed backend processing:
    // - Month view: Backend returns raw events, need frontend expansion
    // - Week/Schedule views: Backend returns expanded occurrences, convert to occurrence format
    
    if (queryConfig.view === 'Month') {
      // Month view: Backend returns raw events that need expansion
      const allOccurrences: EventOccurrence[] = [];
      
      for (const event of events) {
        const occurrences = expandRecurringEvent(event, queryConfig.startDate, queryConfig.endDate, []);
        allOccurrences.push(...occurrences);
      }
      
      // Sort by date
      allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
      return allOccurrences;
    } else {
      // Week/Schedule views: Backend already returns expanded occurrences, convert to occurrence format
      const occurrences: EventOccurrence[] = events.map(event => ({
        id: event._id || `${event._id}-${Date.now()}`,
        originalEventId: event._id || '',
        date: typeof event.start_time === 'string' ? new Date(event.start_time) : event.start_time || new Date(),
        event: event,
        isModified: false,
        isCancelled: false,
      }));
      
      return occurrences;
    }
  }, [eventsQuery.data, queryConfig.view, queryConfig.startDate, queryConfig.endDate]);

  // Memoized helper functions
  const getOccurrencesForDate = useMemo(() => {
    return (date: Date): EventOccurrence[] => {
      const targetDate = format(date, 'yyyy-MM-dd');
      
      return occurrences.filter(occurrence => 
        format(occurrence.date, 'yyyy-MM-dd') === targetDate
      );
    };
  }, [occurrences]);

  const getOccurrencesForDateRange = useMemo(() => {
    return (startDate: Date, endDate: Date): EventOccurrence[] => {
      return occurrences.filter(occurrence =>
        isWithinInterval(occurrence.date, { start: startDate, end: endDate })
      );
    };
  }, [occurrences]);

  const groupedByDate = useMemo(() => {
    return occurrences.reduce((acc, occurrence) => {
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(occurrence);
      return acc;
    }, {} as Record<string, EventOccurrence[]>);
  }, [occurrences]);

  // Memoized result
  return useMemo(() => ({
    events: eventsQuery.data || [],
    occurrences: occurrences,
    loading: eventsQuery.isLoading,
    refreshing: eventsQuery.isFetching,
    eventsError: eventsQuery.isError,
    occurrencesError: false, // No longer a separate query
    hasAnyError: eventsQuery.isError,
    eventsErrorObject: eventsQuery.error,
    occurrencesErrorObject: null, // No longer a separate query
    refetch: async () => {
      // Refetch only the events query - occurrences will update automatically via useMemo
      const eventsResult = await eventsQuery.refetch();
      return { eventsResult, occurrencesResult: eventsResult };
    },
    refreshOccurrences: () => eventsQuery.refetch(), // Refresh events, occurrences will update automatically
    invalidateCalendarQueries: () => {
      // Only invalidate the specific query for this view, not all calendar queries
      queryClient.invalidateQueries({ queryKey: queryConfig.queryKey });
    },
    invalidateOccurrences: () => {
      // Invalidate events query since occurrences are derived from events
      queryClient.invalidateQueries({ queryKey: queryConfig.queryKey });
    },
    getOccurrencesForDate,
    getOccurrencesForDateRange,
    groupedByDate,
  }), [
    eventsQuery,
    occurrences,
    queryClient,
    getOccurrencesForDate,
    getOccurrencesForDateRange,
    groupedByDate,
  ]);
};