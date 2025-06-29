import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { addMonths, addWeeks, startOfMonth, startOfWeek } from 'date-fns';

export type NavigationSource = 'header' | 'month' | 'week' | 'dropdown' | 'refresh' | 'day-select';

interface CalendarContextType {
  currentDate: Date;
  navigateToDate: (date: Date, source: NavigationSource) => void;
  navigateToMonth: (month: number, year: number, preserveDay?: boolean) => void;
  navigateToWeek: (date: Date) => void;
  navigateToDay: (date: Date) => void;
  navigateForward: () => void;
  navigateBackward: () => void;
  resetToToday: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};

interface CalendarProviderProps {
  children: ReactNode;
  view: string;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({ children, view }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateToDate = useCallback((date: Date, source: NavigationSource) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to navigateToDate:', date);
      return;
    }
    setCurrentDate(new Date(date));
  }, []);

  const navigateToMonth = useCallback((month: number, year: number, preserveDay = false) => {
    if (typeof month !== 'number' || typeof year !== 'number' || month < 0 || month > 11) {
      console.warn('Invalid month/year passed to navigateToMonth:', { month, year });
      return;
    }
    
    try {
      const newDate = preserveDay && view?.toLowerCase() === 'week'
        ? new Date(year, month, Math.min(currentDate.getDate(), new Date(year, month + 1, 0).getDate()))
        : new Date(year, month, 1);
      setCurrentDate(newDate);
    } catch (error) {
      console.error('Error in navigateToMonth:', error);
    }
  }, [currentDate, view]);

  const navigateToWeek = useCallback((date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to navigateToWeek:', date);
      return;
    }
    setCurrentDate(new Date(date));
  }, []);

  const navigateToDay = useCallback((date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date passed to navigateToDay:', date);
      return;
    }
    setCurrentDate(new Date(date));
  }, []);

  const resetToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const navigateForward = useCallback(() => {
    try {
      const viewType = view?.toLowerCase();
      if (viewType === 'month') {
        setCurrentDate(prev => addMonths(prev, 1));
      } else if (viewType === 'week') {
        setCurrentDate(prev => addWeeks(prev, 1));
      }
    } catch (error) {
      console.error('Error in navigateForward:', error);
    }
  }, [view]);

  const navigateBackward = useCallback(() => {
    try {
      const viewType = view?.toLowerCase();
      if (viewType === 'month') {
        setCurrentDate(prev => addMonths(prev, -1));
      } else if (viewType === 'week') {
        setCurrentDate(prev => addWeeks(prev, -1));
      }
    } catch (error) {
      console.error('Error in navigateBackward:', error);
    }
  }, [view]);

  const value: CalendarContextType = {
    currentDate,
    navigateToDate,
    navigateToMonth,
    navigateToWeek,
    navigateToDay,
    navigateForward,
    navigateBackward,
    resetToToday,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}; 