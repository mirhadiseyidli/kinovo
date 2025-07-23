import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CalendarErrorState {
  calendarData: boolean;  // Unified error for all calendar data
  occurrences: boolean;   // Keep separate for occurrence processing errors
}

interface CalendarErrorContextType {
  errors: CalendarErrorState;
  setComponentError: (component: keyof CalendarErrorState, hasError: boolean) => void;
  clearAllErrors: () => void;
  hasAnyError: boolean;
  showCachedDataWarning: boolean;
  setShowCachedDataWarning: (show: boolean) => void;
}

const CalendarErrorContext = createContext<CalendarErrorContextType | null>(null);

export const useCalendarError = () => {
  const context = useContext(CalendarErrorContext);
  if (!context) {
    throw new Error('useCalendarError must be used within CalendarErrorProvider');
  }
  return context;
};

interface CalendarErrorProviderProps {
  children: ReactNode;
}

export const CalendarErrorProvider: React.FC<CalendarErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<CalendarErrorState>({
    calendarData: false,
    occurrences: false,
  });
  
  const [showCachedDataWarning, setShowCachedDataWarning] = useState(true);

  const setComponentError = useCallback((component: keyof CalendarErrorState, hasError: boolean) => {
    setErrors(prev => ({
      ...prev,
      [component]: hasError
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({
      calendarData: false,
      occurrences: false,
    });
  }, []);

  const hasAnyError = Object.values(errors).some(Boolean);

  return (
    <CalendarErrorContext.Provider 
      value={{ 
        errors, 
        setComponentError, 
        clearAllErrors, 
        hasAnyError,
        showCachedDataWarning,
        setShowCachedDataWarning
      }}
    >
      {children}
    </CalendarErrorContext.Provider>
  );
};