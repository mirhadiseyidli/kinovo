import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useOptimalCalendarQuery } from '@/hooks/useOptimalCalendarQuery';
import { Event } from '@/types/allTypes';
import { EventOccurrence } from '@/utils/eventUtils';
import { 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks 
} from 'date-fns';
import { useCalendarError } from './CalendarErrorContext';

/**
 * CalendarProvider.v2 - TanStack Query-based Calendar Provider
 * 
 * This provider replaces the EventContext for calendar-specific functionality.
 * It provides:
 * - TanStack Query-based event loading with superior caching
 * - Recurring event occurrence processing
 * - Date range management for calendar views
 * - Optimized memory usage with query-based caching
 * - Backward compatibility with existing calendar components
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
  
  // TanStack Query specific
  calendarQuery: ReturnType<typeof useOptimalCalendarQuery>;
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
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [currentView, setCurrentView] = useState(initialView);
  const { setComponentError, clearAllErrors } = useCalendarError();

  // Single optimal hook call
  const calendarQuery = useOptimalCalendarQuery(currentDate, currentView, {
    staleTime: currentView === 'Month' ? 10 * 60 * 1000 : currentView === 'Week' ? 3 * 60 * 1000 : 5 * 60 * 1000,
  });

  // Report errors to centralized error handling - unified approach
  useEffect(() => {
    // If both queries are successful, clear all errors
    if (!calendarQuery.eventsError && !calendarQuery.occurrencesError && !calendarQuery.loading) {
      clearAllErrors();
    } else {
      // Otherwise, report current error states
      setComponentError('calendarData', calendarQuery.eventsError);
      setComponentError('occurrences', calendarQuery.occurrencesError);
    }
  }, [calendarQuery.eventsError, calendarQuery.occurrencesError, calendarQuery.loading, setComponentError, clearAllErrors]);

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

  // Refresh events
  const refreshEvents = useCallback(async () => {
    await Promise.all([
      calendarQuery.refetch(),
      calendarQuery.refreshOccurrences()
    ]);
  }, [calendarQuery]);

  // Cache invalidation
  const invalidateCalendarCache = useCallback(() => {
    calendarQuery.invalidateCalendarQueries();
    calendarQuery.invalidateOccurrences();
  }, [calendarQuery]);

  const value: CalendarContextType = useMemo(() => ({
    // Current view state
    currentDate,
    currentView,
    
    // Event data
    events: calendarQuery.events,
    eventOccurrences: calendarQuery.occurrences,
    
    // Loading states
    loading: calendarQuery.loading,
    refreshing: calendarQuery.refreshing,
    
    // Navigation
    setCurrentDate,
    setCurrentView,
    navigateToToday,
    navigateNext,
    navigatePrevious,
    
    // Event operations
    refreshEvents,
    
    // Occurrence operations (backward compatibility)
    getOccurrencesForDate: calendarQuery.getOccurrencesForDate,
    getOccurrencesForDateRange: calendarQuery.getOccurrencesForDateRange,
    groupedByDate: calendarQuery.groupedByDate,
    
    // Cache operations
    invalidateCalendarCache,
    
    // TanStack Query specific
    calendarQuery,
  }), [
    currentDate,
    currentView,
    calendarQuery.events,
    calendarQuery.occurrences,
    calendarQuery.loading,
    calendarQuery.refreshing,
    calendarQuery.getOccurrencesForDate,
    calendarQuery.getOccurrencesForDateRange,
    calendarQuery.groupedByDate,
    setCurrentDate,
    setCurrentView,
    navigateToToday,
    navigateNext,
    navigatePrevious,
    refreshEvents,
    invalidateCalendarCache,
    calendarQuery,
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