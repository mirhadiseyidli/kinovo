import React, { createContext, useContext, useState, useCallback, ReactNode, memo } from 'react';

export type ViewChangeSource = 'header_picker' | 'day_cell' | 'month_selector' | 'default';

interface CalendarViewContextProps {
  view: string;
  setView: (view: string, source?: ViewChangeSource) => void;
  lastViewChangeSource: ViewChangeSource;
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
  const [lastViewChangeSource, setLastViewChangeSource] = useState<ViewChangeSource>('default');

  const handleSetView = useCallback((newView: string, source: ViewChangeSource = 'default') => {
    setView(newView);
    setLastViewChangeSource(source);
  }, []);

  return (
    <CalendarViewContext.Provider value={{ view, setView: handleSetView, lastViewChangeSource }}>
      {children}
    </CalendarViewContext.Provider>
  );
});