import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useEventsStore } from '@/hooks/useEventsStore';
import { Event } from '@/types/allTypes';
import { EventOccurrence } from '@/utils/eventUtils';
import { 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  format,
  isWithinInterval
} from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useCalendarError } from './CalendarErrorContext';
import api from '@/utils/api';
import { useCalendarCacheManager } from '@/hooks/useCalendarCacheManager';

/**
 * CalendarProvider.v2 - MIGRATED to New TanStack Query Architecture
 * 
 * This provider replaces the EventContext for calendar-specific functionality.
 * It provides:
 * - New simplified TanStack Query architecture with direct cache updates
 * - Single event store with tagging system for better performance
 * - Direct cache updates instead of invalidations
 * - Recurring event occurrence processing
 * - Date range management for calendar views
 * - Optimized memory usage with unified caching
 * - Backward compatibility with existing calendar components
 * 
 * Migration changes:
 * - Replaced useOptimalCalendarQuery with direct useCalendarEvents hooks
 * - Uses new TanStack Query architecture for better performance
 * - Direct integration with event store and cache management
 */

interface CalendarContextType {
  // Current view state
  currentDate: Date;
  currentView: 'Month' | 'Week' | 'Schedule';
  
  // Event data
  events: Event[];
  eventOccurrences: EventOccurrence[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Calendar navigation
  setCurrentDate: (date: Date) => void;
  setCurrentView: (view: 'Month' | 'Week' | 'Schedule') => void;
  navigateToToday: () => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  
  // Event operations
  refreshEvents: () => Promise<void>;
  
  // Occurrence operations (backward compatibility)
  getOccurrencesForDate: (date: Date) => EventOccurrence[];
  getOccurrencesForDateRange: (startDate: Date, endDate: Date) => EventOccurrence[];
  groupedByDate: Record<string, EventOccurrence[]>;
  
  // Cache operations
  invalidateCalendarCache: () => void;
  
  // Error states
  eventsError: boolean;
  occurrencesError: boolean;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider.v2');
  }
  return context;
};

interface CalendarProviderProps {
  children: ReactNode;
  initialDate?: Date;
  initialView?: 'Month' | 'Week' | 'Schedule';
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ 
  children, 
  initialDate = new Date(),
  initialView = 'Month'
}) => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentView, setCurrentView] = useState(initialView);
  const { setComponentError, clearAllErrors } = useCalendarError();

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

  // Use unified event store as single source of truth
  const eventsStoreQuery = useEventsStore();
  const allEvents = eventsStoreQuery.data || [];
  
  // Calendar cache manager for updating unified cache with range events
  const { updateCacheWithRangeEvents } = useCalendarCacheManager();
  
  // Filter events based on current date range and view - optimize with stable keys
  const eventsInInterval = useMemo(() => {
    if (!allEvents?.length) return [];
    
    return allEvents.filter((event: Event) => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time);
      return isWithinInterval(eventDate, { start: startDate, end: endDate });
    });
  }, [allEvents?.length, startDate.getTime(), endDate.getTime()]); // Use stable dependencies

  // Fetch and update cache with range events when date range changes
  // Implement cache-first strategy to prevent disappearing events on mount/refresh
  useEffect(() => {
    // Only fetch range events after initial store load completes
    // This ensures we don't clear existing cache during mount
    if (!eventsStoreQuery.isLoading && !eventsStoreQuery.isFetching) {
      updateCacheWithRangeEvents(startDate, endDate);
    }
  }, [eventsStoreQuery.isLoading, eventsStoreQuery.isFetching, updateCacheWithRangeEvents, startDate, endDate]);

  // Use events from unified store (all events in interval are valid for calendar)
  const events = eventsInInterval; // Remove unnecessary useMemo wrapping


  // Backend already handles recurring event expansion, so we just use events directly
  // Convert to occurrence format for backward compatibility with existing calendar components
  const occurrences = useMemo(() => {
    if (!events?.length) return [];

    // Use reduce for better performance than filter + map + filter
    const validOccurrences = events.reduce<EventOccurrence[]>((acc, event: Event) => {
      if (!event.start_time) return acc;
      
      const startTime = new Date(event.start_time);
      
      // Skip events with invalid dates
      if (isNaN(startTime.getTime())) return acc;
      
      // For recurring events, backend provides originalEventId and modified _id (e.g., originalId-2025-08-13)
      const originalEventId = (event as any).originalEventId || event._id;
      
      acc.push({
        id: event._id!, // Use backend-provided ID (unique for each occurrence)
        originalEventId: originalEventId,
        date: startTime,
        event: event,
        isModified: false,
        isCancelled: false,
      });
      
      return acc;
    }, []);

    // Sort once at the end
    return validOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events?.length, events]); // Optimize dependencies

  // Report errors to centralized error handling
  useEffect(() => {
    // If query is successful, clear all errors
    if (!eventsStoreQuery.isError && !eventsStoreQuery.isLoading) {
      clearAllErrors();
    } else {
      // Otherwise, report current error states
      setComponentError('calendarData', eventsStoreQuery.isError);
    }
  }, [eventsStoreQuery.isError, eventsStoreQuery.isLoading, setComponentError, clearAllErrors]);

  // Navigation functions
  const navigateToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const navigateNext = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (currentView) {
        case 'Month':
          return addMonths(prevDate, 1);
        case 'Week':
          return addWeeks(prevDate, 1);
        case 'Schedule':
          return addMonths(prevDate, 1);
        default:
          return prevDate;
      }
    });
  }, [currentView]);

  const navigatePrevious = useCallback(() => {
    setCurrentDate(prevDate => {
      switch (currentView) {
        case 'Month':
          return subMonths(prevDate, 1);
        case 'Week':
          return subWeeks(prevDate, 1);
        case 'Schedule':
          return subMonths(prevDate, 1);
        default:
          return prevDate;
      }
    });
  }, [currentView]);

  // Helper functions for occurrences
  const getOccurrencesForDate = useCallback((date: Date): EventOccurrence[] => {
    const targetDate = format(date, 'yyyy-MM-dd');
    return occurrences.filter((occurrence: EventOccurrence) => 
      format(occurrence.date, 'yyyy-MM-dd') === targetDate
    );
  }, [occurrences]);

  const getOccurrencesForDateRange = useCallback((start: Date, end: Date): EventOccurrence[] => {
    return occurrences.filter((occurrence: EventOccurrence) =>
      isWithinInterval(occurrence.date, { start, end })
    );
  }, [occurrences]);

  const groupedByDate = useMemo(() => {
    return occurrences.reduce((acc: Record<string, EventOccurrence[]>, occurrence: EventOccurrence) => {
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(occurrence);
      return acc;
    }, {} as Record<string, EventOccurrence[]>);
  }, [occurrences]);

  // Refresh events - refetch unified store and update cache with range events
  const refreshEvents = useCallback(async () => {
    await eventsStoreQuery.refetch();
    await updateCacheWithRangeEvents(startDate, endDate);
  }, [eventsStoreQuery, updateCacheWithRangeEvents, startDate, endDate]);

  // Cache invalidation
  const invalidateCalendarCache = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['events', 'store'] 
    });
  }, [queryClient]);

  const value: CalendarContextType = useMemo(() => {
    const contextValue = {
      // Current view state
      currentDate,
      currentView,
      
      // Event data
      events,
      eventOccurrences: occurrences,
      
      // Loading states (unified store only)
      loading: eventsStoreQuery.isLoading,
      refreshing: eventsStoreQuery.isFetching,
      
      // Navigation
      setCurrentDate,
      setCurrentView,
      navigateToToday,
      navigateNext,
      navigatePrevious,
      
      // Event operations
      refreshEvents,
      
      // Occurrence operations (backward compatibility)
      getOccurrencesForDate,
      getOccurrencesForDateRange,
      groupedByDate,
      
      // Cache operations
      invalidateCalendarCache,
      
      // Error states (unified store only)
      eventsError: eventsStoreQuery.isError,
      occurrencesError: false, // No separate occurrences query in new architecture
    };
    
    return contextValue;
  }, [
    currentDate,
    currentView,
    events,
    occurrences,
    eventsStoreQuery.isLoading,
    eventsStoreQuery.isFetching,
    eventsStoreQuery.isError,
    setCurrentDate,
    setCurrentView,
    navigateToToday,
    navigateNext,
    navigatePrevious,
    refreshEvents,
    getOccurrencesForDate,
    getOccurrencesForDateRange,
    groupedByDate,
    invalidateCalendarCache,
  ]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

/**
 * Hook to access calendar-specific functionality
 * This maintains backward compatibility with existing calendar components
 */
export const useCalendar = () => {
  const context = useCalendarContext();
  
  return {
    // State
    currentDate: context.currentDate,
    currentView: context.currentView,
    events: context.events,
    eventOccurrences: context.eventOccurrences,
    loading: context.loading,
    refreshing: context.refreshing,
    
    // Navigation
    setCurrentDate: context.setCurrentDate,
    setCurrentView: context.setCurrentView,
    navigateToToday: context.navigateToToday,
    navigateNext: context.navigateNext,
    navigatePrevious: context.navigatePrevious,
    
    // Event operations
    refreshEvents: context.refreshEvents,
    
    // Occurrence helpers
    getOccurrencesForDate: context.getOccurrencesForDate,
    getOccurrencesForDateRange: context.getOccurrencesForDateRange,
    groupedByDate: context.groupedByDate,
    
    // Cache management
    invalidateCache: context.invalidateCalendarCache,
  };
};

/**
 * Backward compatibility hook that provides the same interface as EventContext
 * for calendar-related operations
 */
export const useEventContextCalendar = () => {
  const calendar = useCalendar();
  
  return {
    // Event data
    events: calendar.events,
    eventOccurrences: calendar.eventOccurrences,
    loading: calendar.loading,
    refreshing: calendar.refreshing,
    
    // Event operations (backward compatibility)
    refreshEvents: (date: Date, view: 'Month' | 'Week' | 'Schedule') => {
      calendar.setCurrentDate(date);
      calendar.setCurrentView(view);
      return calendar.refreshEvents();
    },
    
    // Occurrence operations (backward compatibility)
    getOccurrencesForDate: calendar.getOccurrencesForDate,
    getOccurrencesForDateRange: calendar.getOccurrencesForDateRange,
    
    // Cache operations (backward compatibility)
    clearCache: calendar.invalidateCache,
    invalidateEvent: (_eventId: string) => {
      // TanStack Query will handle this automatically through mutations
      calendar.invalidateCache();
    },
  };
};