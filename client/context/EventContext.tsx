import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Event } from '@/types/allTypes';
import { 
  EventOccurrence, 
  RecurringEventModification, 
  expandRecurringEvent, 
  groupOccurrencesByDate,
  getOccurrencesForDate,
  getOccurrencesForDateRange
} from '@/utils/eventUtils';
import { 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO
} from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

interface EventContextType {
  // Event data
  events: Event[];
  eventOccurrences: EventOccurrence[];
  eventModifications: RecurringEventModification[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  
  // Cache management
  cachedDateRanges: { start: Date; end: Date }[];
  
  // Event operations
  fetchEventsForDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  fetchEventsForMonth: (month: number, year: number) => Promise<void>;
  fetchEventsForWeek: (date: Date) => Promise<void>;
  refreshEvents: () => Promise<void>;
  
  // Occurrence operations
  getOccurrencesForDate: (date: Date) => EventOccurrence[];
  getOccurrencesForDateRange: (startDate: Date, endDate: Date) => EventOccurrence[];
  
  // Recurring event operations
  modifyRecurringEvent: (
    eventId: string, 
    occurrenceDate: Date, 
    modifications: Partial<Event>, 
    modifyType: 'this_only' | 'this_and_future' | 'all_instances'
  ) => Promise<void>;
  
  // Cache operations
  clearCache: () => void;
  isDateRangeCached: (startDate: Date, endDate: Date) => boolean;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEventContext = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
};

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventOccurrences, setEventOccurrences] = useState<EventOccurrence[]>([]);
  const [eventModifications, setEventModifications] = useState<RecurringEventModification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedDateRanges, setCachedDateRanges] = useState<{ start: Date; end: Date }[]>([]);
  
  const { refreshAccessToken } = useAuthSession();

  // Load cached modifications on mount
  useEffect(() => {
    loadCachedModifications();
  }, []);

  const loadCachedModifications = async () => {
    try {
      const cached = await AsyncStorage.getItem('eventModifications');
      if (cached) {
        const modifications = JSON.parse(cached).map((mod: any) => ({
          ...mod,
          occurrenceDate: new Date(mod.occurrenceDate)
        }));
        setEventModifications(modifications);
      }
    } catch (error) {
      console.error('Error loading cached modifications:', error);
    }
  };

  const saveCachedModifications = async (modifications: RecurringEventModification[]) => {
    try {
      await AsyncStorage.setItem('eventModifications', JSON.stringify(modifications));
    } catch (error) {
      console.error('Error saving modifications:', error);
    }
  };

  const fetchEventsFromAPI = async (startDate: Date, endDate: Date): Promise<Event[]> => {
    try {
      const response = await api.get(
        `/api/manageevents/eventslist/get/my/events/range?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}`
      );

      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  };

  const isDateRangeCached = useCallback((startDate: Date, endDate: Date): boolean => {
    return cachedDateRanges.some(range => 
      range.start <= startDate && range.end >= endDate
    );
  }, [cachedDateRanges]);

  const expandEventsToOccurrences = useCallback((events: Event[], startDate: Date, endDate: Date): EventOccurrence[] => {
    const allOccurrences: EventOccurrence[] = [];
    
    events.forEach(event => {
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
        // For non-recurring events or original recurring events, use the expansion function
      const occurrences = expandRecurringEvent(event, startDate, endDate, eventModifications);
      allOccurrences.push(...occurrences);
      }
    });

    return allOccurrences;
  }, [eventModifications]);

  const fetchEventsForDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    if (isDateRangeCached(startDate, endDate)) {
      return; // Already cached
    }

    setLoading(true);
    try {
      const fetchedEvents = await fetchEventsFromAPI(startDate, endDate);
      
      // Merge with existing events (avoid duplicates)
      // For recurring event occurrences, we need to check by both _id and originalEventId
      setEvents(prevEvents => {
        const existingIds = new Set(prevEvents.map(e => e._id));
        const existingOccurrenceIds = new Set(
          prevEvents
            .filter(e => e.isRecurringOccurrence)
            .map(e => e._id)
        );
        
        const newEvents = fetchedEvents.filter(e => {
          // Skip if we already have this exact event ID
          if (existingIds.has(e._id)) return false;
          
          // For recurring occurrences, also check if we already have this specific occurrence
          if (e.isRecurringOccurrence && existingOccurrenceIds.has(e._id)) return false;
          
          return true;
        });
        
        return [...prevEvents, ...newEvents];
      });

      // Update cached ranges
      setCachedDateRanges(prev => [...prev, { start: startDate, end: endDate }]);

      // Re-expand ALL events to occurrences for the ENTIRE cached range
      // This ensures we don't have duplicates and everything is properly sorted
      const allEvents = [...events, ...fetchedEvents.filter(e => {
        // Same filtering logic as above
        const existingIds = new Set(events.map(existing => existing._id));
        if (existingIds.has(e._id)) return false;
        
        if (e.isRecurringOccurrence) {
          const existingOccurrenceIds = new Set(
            events
              .filter(existing => existing.isRecurringOccurrence)
              .map(existing => existing._id)
          );
          if (existingOccurrenceIds.has(e._id)) return false;
        }
        
        return true;
      })];
      
      // Calculate the full range of all cached data
      const allRanges = [...cachedDateRanges, { start: startDate, end: endDate }];
      const fullStartDate = new Date(Math.min(...allRanges.map(r => r.start.getTime())));
      const fullEndDate = new Date(Math.max(...allRanges.map(r => r.end.getTime())));
      
      // Expand all events for the full range
      const allOccurrences = expandEventsToOccurrences(allEvents, fullStartDate, fullEndDate);
      
      // Sort occurrences chronologically and remove duplicates
      const sortedOccurrences = allOccurrences
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .filter((occurrence, index, array) => {
          // Remove duplicates based on occurrence id
          return index === 0 || occurrence.id !== array[index - 1].id;
        });
      
      setEventOccurrences(sortedOccurrences);

    } catch (error) {
      console.error('Error fetching events for date range:', error);
    } finally {
      setLoading(false);
    }
  }, [events, isDateRangeCached, expandEventsToOccurrences, cachedDateRanges]);

  const fetchEventsForMonth = useCallback(async (month: number, year: number) => {
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    
    // Extend range to include previous and next month for better UX
    const extendedStart = startOfMonth(subMonths(startDate, 1));
    const extendedEnd = endOfMonth(addMonths(endDate, 1));
    
    await fetchEventsForDateRange(extendedStart, extendedEnd);
  }, [fetchEventsForDateRange]);

  const fetchEventsForWeek = useCallback(async (date: Date) => {
    const startDate = startOfWeek(date);
    const endDate = endOfWeek(date);
    
    // Extend range to include previous and next week
    const extendedStart = startOfWeek(subWeeks(date, 1));
    const extendedEnd = endOfWeek(addWeeks(date, 1));
    
    await fetchEventsForDateRange(extendedStart, extendedEnd);
  }, [fetchEventsForDateRange]);

  const refreshEvents = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear cache and refetch
      clearCache();
      
      // Refetch for current month
      const now = new Date();
      await fetchEventsForMonth(now.getMonth(), now.getFullYear());
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchEventsForMonth]);

  const getOccurrencesForDateFunc = useCallback((date: Date): EventOccurrence[] => {
    return getOccurrencesForDate(eventOccurrences, date);
  }, [eventOccurrences]);

  const getOccurrencesForDateRangeFunc = useCallback((startDate: Date, endDate: Date): EventOccurrence[] => {
    return getOccurrencesForDateRange(eventOccurrences, startDate, endDate);
  }, [eventOccurrences]);

  const modifyRecurringEvent = useCallback(async (
    eventId: string,
    occurrenceDate: Date,
    modifications: Partial<Event>,
    modifyType: 'this_only' | 'this_and_future' | 'all_instances'
  ) => {
    try {
      // Create modification record
      const modification: RecurringEventModification = {
        originalEventId: eventId,
        occurrenceDate,
        modifiedEvent: modifications,
        modifyType
      };

      // Update local modifications
      const updatedModifications = [...eventModifications, modification];
      setEventModifications(updatedModifications);
      await saveCachedModifications(updatedModifications);

      // Re-expand events with new modifications
      const allOccurrences = expandEventsToOccurrences(events, 
        new Date(Math.min(...cachedDateRanges.map(r => r.start.getTime()))),
        new Date(Math.max(...cachedDateRanges.map(r => r.end.getTime())))
      );
      setEventOccurrences(allOccurrences);

      // TODO: Send modification to backend
      // await sendModificationToBackend(modification);

    } catch (error) {
      console.error('Error modifying recurring event:', error);
    }
  }, [eventModifications, events, cachedDateRanges, expandEventsToOccurrences]);

  const clearCache = useCallback(() => {
    setEvents([]);
    setEventOccurrences([]);
    setCachedDateRanges([]);
  }, []);

  const value: EventContextType = {
    events,
    eventOccurrences,
    eventModifications,
    loading,
    refreshing,
    cachedDateRanges,
    fetchEventsForDateRange,
    fetchEventsForMonth,
    fetchEventsForWeek,
    refreshEvents,
    getOccurrencesForDate: getOccurrencesForDateFunc,
    getOccurrencesForDateRange: getOccurrencesForDateRangeFunc,
    modifyRecurringEvent,
    clearCache,
    isDateRangeCached
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}; 