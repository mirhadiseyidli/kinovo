import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths,
  format,
  isWithinInterval 
} from 'date-fns';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { EventOccurrence } from '@/utils/eventUtils';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

// Calendar events for specific month
export const useCalendarEvents = (month: number, year: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'calendar', month, year, userId],
    queryFn: async () => {
      const response = await api.get('/api/manageevents/eventslist/get/my/events/month/view', {
        params: { month, year }
      });
      return response.data.events || [];
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // Calendar events can be cached longer
  });
};

// Calendar events for date range
export const useCalendarEventsForDateRange = (
  startDate: Date, 
  endDate: Date, 
  includeRecurring: boolean = true
) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'calendar-range', startDate, endDate, includeRecurring, userId],
    queryFn: async () => {
      const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
        params: { 
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          includeRecurring 
        }
      });
      return response.data.events || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
    networkMode: 'offlineFirst',
  });
};

// Event occurrences for recurring events
export const useEventOccurrences = (
  eventId: string, 
  startDate: Date, 
  endDate: Date
) => {
  return useQuery({
    queryKey: ['events', 'occurrences', eventId, startDate, endDate],
    queryFn: async () => {
      // Note: No specific occurrences endpoint found in routes, using event by id
      const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id`, {
        params: { 
          _id: eventId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data.occurrences || [];
    },
    enabled: !!eventId,
    staleTime: 15 * 60 * 1000,
  });
};

// Optimal calendar hook that handles all views
export const useOptimalCalendarQuery = (
  currentDate: Date,
  currentView: 'Month' | 'Week' | 'Schedule'
) => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();
  
  // Calculate date range based on view
  const { startDate, endDate } = useMemo(() => {
    switch (currentView) {
      case 'Month': {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return { 
          startDate: startOfWeek(subMonths(start, 1)), 
          endDate: endOfWeek(addMonths(end, 1)) 
        };
      }
      case 'Week': {
        return { 
          startDate: startOfWeek(subMonths(currentDate, 1)), 
          endDate: endOfWeek(addMonths(currentDate, 1)) 
        };
      }
      case 'Schedule': {
        return { 
          startDate: startOfMonth(subMonths(currentDate, 1)), 
          endDate: endOfMonth(addMonths(currentDate, 1)) 
        };
      }
      default:
        return { startDate: currentDate, endDate: currentDate };
    }
  }, [currentDate, currentView]);

  // Events query
  const eventsQuery = useQuery({
    queryKey: ['events', 'calendar-optimal', currentView, startDate, endDate, userId],
    queryFn: async () => {
      if (currentView === 'Month') {
        const response = await api.get('/api/manageevents/eventslist/get/my/events/month/view', {
          params: { month: currentDate.getMonth(), year: currentDate.getFullYear() }
        });
        return response.data.events || [];
      } else {
        const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
          params: { 
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            includeRecurring: true
          }
        });
        return response.data.events || [];
      }
    },
    enabled: !!userId,
    staleTime: currentView === 'Month' ? 10 * 60 * 1000 : 3 * 60 * 1000,
  });

  // Generate occurrences
  const occurrences = useMemo(() => {
    const events = eventsQuery.data || [];
    if (!events.length) return [];

    // Backend already handles recurring event expansion and excluded dates
    // Just convert events to occurrence format for consistency
    return events.map((event: Event) => ({
      id: event._id || `${event._id}-${Date.now()}`,
      originalEventId: event._id || '',
      date: new Date(event.start_time || new Date()),
      event: event,
      isModified: false,
      isCancelled: false,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [eventsQuery.data]);

  // Helper functions
  const getOccurrencesForDate = useMemo(() => {
    return (date: Date): EventOccurrence[] => {
      const targetDate = format(date, 'yyyy-MM-dd');
      return occurrences.filter((occurrence: EventOccurrence) => 
        format(occurrence.date, 'yyyy-MM-dd') === targetDate
      );
    };
  }, [occurrences]);

  const getOccurrencesForDateRange = useMemo(() => {
    return (start: Date, end: Date): EventOccurrence[] => {
      return occurrences.filter((occurrence: EventOccurrence) =>
        isWithinInterval(occurrence.date, { start, end })
      );
    };
  }, [occurrences]);

  const groupedByDate = useMemo(() => {
    return occurrences.reduce((acc: Record<string, EventOccurrence[]>, occurrence: EventOccurrence) => {
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(occurrence);
      return acc;
    }, {} as Record<string, EventOccurrence[]>);
  }, [occurrences]);

  return {
    events: eventsQuery.data || [],
    occurrences,
    loading: eventsQuery.isLoading,
    refreshing: eventsQuery.isFetching,
    error: eventsQuery.isError,
    errorObject: eventsQuery.error,
    refetch: eventsQuery.refetch,
    getOccurrencesForDate,
    getOccurrencesForDateRange,
    groupedByDate,
    invalidateCalendarQueries: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'calendar-optimal', currentView] 
      });
    },
  };
};