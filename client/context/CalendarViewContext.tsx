import React, { createContext, useContext, useState, useCallback, ReactNode, memo } from 'react';

interface CalendarViewContextProps {
  view: string;
  setView: (view: string) => void;
}

const CalendarViewContext = createContext<CalendarViewContextProps | undefined>(undefined);

export const useCalendarViewContext = (): CalendarViewContextProps => {
  const context = useContext(CalendarViewContext);
  if (!context) {
    throw new Error('useCalendarViewContext must be used within a CalendarViewProvider');
  }
  return context;
};

interface ProviderProps {
  children: ReactNode;
}

export const CalendarViewProvider = memo(({ children }: ProviderProps) => {
  const [view, setView] = useState('Month');

  const handleSetView = useCallback((newView: string) => {
    setView(newView);
  }, []);

  return (
    <CalendarViewContext.Provider value={{ view, setView: handleSetView }}>
      {children}
    </CalendarViewContext.Provider>
  );
});