import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
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
import { cacheManager } from '@/utils/homeScreenCache';

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
  fetchEventsForDateRange: (startDate: Date, endDate: Date, forceRefresh?: boolean) => Promise<void>;
  fetchEventsForMonth: (month: number, year: number) => Promise<void>;
  fetchEventsForWeek: (date: Date) => Promise<void>;
  refreshEvents: (date: Date, view: 'Month' | 'Week' | 'Schedule') => Promise<void>;
  
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
  invalidateEvent: (eventId: string) => void;

  // New operations for event updates
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setEventOccurrences: React.Dispatch<React.SetStateAction<EventOccurrence[]>>;
  expandEventsToOccurrences: (events: Event[], startDate: Date, endDate: Date, modifications?: RecurringEventModification[]) => EventOccurrence[];

  // Event update subscription
  subscribeToEventUpdates: (eventId: string) => void;
  unsubscribeFromEventUpdates: (eventId: string) => void;
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
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingFetchRef = useRef<Promise<void> | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { userId } = useAuthSession();
  
  // Performance optimization: Cache for event occurrences to prevent recalculation
  const occurrenceCache = React.useRef(new Map<string, EventOccurrence[]>());
  const lastEventsHash = React.useRef<string>('');
  
  // Memory management: Limit cache sizes and implement cleanup
  const MAX_CACHE_SIZE = 20; // Reduced from 50
  const MAX_CACHED_RANGES = 3; // Limit cached date ranges
  const MAX_EVENT_OCCURRENCES = 1000; // Limit total occurrences in memory
  
  // Track which events need updates
  const [eventsToUpdate, setEventsToUpdate] = useState<Set<string>>(new Set());

  // Memory cleanup effect
  useEffect(() => {
    const cleanup = () => {
      // Clear caches when they get too large
      if (occurrenceCache.current.size > MAX_CACHE_SIZE) {
        occurrenceCache.current.clear();
      }
      
      // Limit event occurrences in memory
      if (eventOccurrences.length > MAX_EVENT_OCCURRENCES) {
        // Keep only recent occurrences (current month ± 1 month)
        const now = new Date();
        const cutoffStart = startOfMonth(subMonths(now, 1));
        const cutoffEnd = endOfMonth(addMonths(now, 1));
        
        setEventOccurrences(prev => 
          prev.filter(occ => occ.date >= cutoffStart && occ.date <= cutoffEnd)
        );
      }
      
      // Limit cached date ranges
      if (cachedDateRanges.length > MAX_CACHED_RANGES) {
        setCachedDateRanges(prev => prev.slice(-MAX_CACHED_RANGES));
      }
    };

    const interval = setInterval(cleanup, 30000); // Run cleanup every 30 seconds
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      pendingFetchRef.current = null;
    };
  }, [eventOccurrences.length, cachedDateRanges.length]);

  // Load cached modifications on mount
  useEffect(() => {
    loadCachedModifications();
    // SECURITY: Clean up any existing cached events where user is not an attendee
    cleanupNonAttendeeEvents();
  }, []);

  // SECURITY: Remove any cached events where current user is not an attendee
  const cleanupNonAttendeeEvents = useCallback(() => {
    if (!userId) return;
    
    setEvents(prevEvents => {
      const validEvents = prevEvents.filter(event => {
        if (!event.attendees) return false;
        
        return event.attendees.some((attendee: { user: any; status: string }) => {
          const attendeeId = attendee.user._id || attendee.user;
          return attendeeId.toString() === userId.toString();
        });
      });
      
      if (validEvents.length !== prevEvents.length) {
        console.log(`[EventContext] Cleaned up ${prevEvents.length - validEvents.length} non-attendee events from cache`);
      }
      
      return validEvents;
    });
  }, [userId]);

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

  const fetchEventsFromAPI = async (startDate: Date, endDate: Date, forceRefresh: boolean = false): Promise<Event[]> => {
    try {
      // Add cache busting parameter for force refresh
      const cacheParam = forceRefresh ? `&_t=${Date.now()}` : '';
      const url = `/api/manageevents/eventslist/get/my/events/range?start=${format(startDate, 'yyyy-MM-dd')}&end=${format(endDate, 'yyyy-MM-dd')}${cacheParam}`;
      
      console.log(`[EventContext] Fetching events from API (forceRefresh: ${forceRefresh}):`, url);
      
      const response = await api.get(url);

      const events = response.data.events || [];
      
      console.log(`[EventContext] Received ${events.length} events from API`);
      
      // SECURITY: Extra validation to ensure only events where user is an attendee are cached
      const filteredEvents = events.filter((event: Event) => {
        if (!event.attendees || !userId) return false;
        
        return event.attendees.some((attendee: { user: any; status: string }) => {
          const attendeeId = attendee.user._id || attendee.user;
          return attendeeId.toString() === userId.toString();
        });
      });
      
      console.log(`[EventContext] After filtering: ${filteredEvents.length} events where user is attendee`);
      
      return filteredEvents;
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

  const expandEventsToOccurrences = useCallback((events: Event[], startDate: Date, endDate: Date, modifications?: RecurringEventModification[]): EventOccurrence[] => {
    // Use passed modifications or current ones, but don't depend on state
    const modsToUse = modifications || eventModifications;
    
    // Early return if no events to process
    if (!events || events.length === 0) {
      return [];
    }
    
    // Performance optimization: Create cache key based on events and date range
    const eventsHash = events.map(e => `${e._id}-${e.start_time}-${e.recurrence?.frequency || 'none'}`).sort().join('|');
    const modificationsHash = modsToUse.map(m => `${m.originalEventId}-${m.occurrenceDate.getTime()}`).sort().join('|');
    const cacheKey = `${eventsHash}-${modificationsHash}-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Return cached result if available
    if (occurrenceCache.current.has(cacheKey)) {
      return occurrenceCache.current.get(cacheKey)!;
    }
    
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
      const occurrences = expandRecurringEvent(event, startDate, endDate, modsToUse);
      allOccurrences.push(...occurrences);
      }
    });

    // Cache management: clear cache if it gets too large
    if (occurrenceCache.current.size > 50) {
      occurrenceCache.current.clear();
    }
    
    // Cache the result
    occurrenceCache.current.set(cacheKey, allOccurrences);
    
    return allOccurrences;
  }, []); // Remove dependency on eventModifications

  const fetchEventsForDateRange = useCallback(async (startDate: Date, endDate: Date, forceRefresh: boolean = false) => {
    if (!forceRefresh && isDateRangeCached(startDate, endDate)) {
      return; // Already cached
    }

    // Prevent concurrent fetch operations
    if (pendingFetchRef.current) {
      await pendingFetchRef.current;
      // Check cache again after waiting for pending operation
      if (isDateRangeCached(startDate, endDate)) {
        return;
      }
    }

    // Clear any pending debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const fetchOperation = async () => {
      setLoading(true);
      try {
        // Clear occurrence cache on force refresh to ensure fresh calculations
        if (forceRefresh) {
          console.log('[EventContext] Clearing occurrence cache for force refresh');
          occurrenceCache.current.clear();
        }
        
        const fetchedEvents = await fetchEventsFromAPI(startDate, endDate, forceRefresh);
        
        // Use atomic update with a single setState call to prevent race conditions
        setEvents(prevEvents => {
          let mergedEvents: Event[];
          
          if (forceRefresh) {
            // For force refresh, replace existing events with fresh data instead of filtering
            console.log('[EventContext] Force refresh: replacing existing events with fresh data');
            const eventMap = new Map(prevEvents.map(e => [e._id, e]));
            
            // Replace existing events with fresh versions
            fetchedEvents.forEach(freshEvent => {
              if (freshEvent._id) {
                eventMap.set(freshEvent._id, freshEvent);
              }
            });
            
            mergedEvents = Array.from(eventMap.values());
          } else {
            // Normal fetch: only add truly new events
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
            
            mergedEvents = [...prevEvents, ...newEvents];
          }
          
          // Update cached ranges and occurrences in the same update cycle
          setCachedDateRanges(prevRanges => {
            const hasOverlap = prevRanges.some(range => 
              (startDate >= range.start && startDate <= range.end) ||
              (endDate >= range.start && endDate <= range.end) ||
              (startDate <= range.start && endDate >= range.end)
            );
            
            const newRanges = hasOverlap ? prevRanges : [...prevRanges, { start: startDate, end: endDate }];
            
            // Recalculate occurrences with the new events and ranges
            if (newRanges.length > 0) {
              const fullStartDate = new Date(Math.min(...newRanges.map(r => r.start.getTime())));
              const fullEndDate = new Date(Math.max(...newRanges.map(r => r.end.getTime())));
              
              const allOccurrences = expandEventsToOccurrences(mergedEvents, fullStartDate, fullEndDate, eventModifications);
              
              // Remove duplicates and sort
              const uniqueOccurrences = allOccurrences
                .filter((occurrence: EventOccurrence, index: number, array: EventOccurrence[]) => {
                  return index === array.findIndex(occ => occ.id === occurrence.id);
                })
                .sort((a: EventOccurrence, b: EventOccurrence) => a.date.getTime() - b.date.getTime());
              
              setEventOccurrences(uniqueOccurrences);
            }
            
            return newRanges;
          });
          
          return mergedEvents;
        });

      } catch (error) {
        console.error('Error fetching events for date range:', error);
      } finally {
        setLoading(false);
        pendingFetchRef.current = null;
      }
    };

    // Set pending operation and execute
    pendingFetchRef.current = fetchOperation();
    await pendingFetchRef.current;
  }, [isDateRangeCached]);

  const fetchEventsForMonth = useCallback(async (month: number, year: number) => {
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));
    
    // Reduced range: only extend by current month ± 2 weeks instead of ± 1 month
    const extendedStart = startOfWeek(subWeeks(startDate, 2));
    const extendedEnd = endOfWeek(addWeeks(endDate, 2));
    
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

  const clearCache = useCallback(() => {
    setEvents([]);
    setEventOccurrences([]);
    setCachedDateRanges([]);
    // Clear stale event update subscriptions
    setEventsToUpdate(new Set());
    // Performance optimization: Clear occurrence cache when clearing main cache
    occurrenceCache.current.clear();
    
    // Force garbage collection hint (if available)
    if (global.gc) {
      global.gc();
    }
  }, []);

  const refreshEvents = useCallback(async (date: Date, view: 'Month' | 'Week' | 'Schedule') => {
    setRefreshing(true);
    try {
      // IMPORTANT: Clear event subscriptions before refresh to prevent override of fresh data
      console.log('[EventContext] Clearing event subscriptions before refresh to prevent data override');
      setEventsToUpdate(new Set());
      
      // Force refetch by bypassing cache check
      if (view === 'Month') {
        const startDate = startOfMonth(new Date(date.getFullYear(), date.getMonth()));
        const endDate = endOfMonth(new Date(date.getFullYear(), date.getMonth()));
        // Extend range to include previous and next month for better UX
        const extendedStart = startOfWeek(subWeeks(startDate, 2));
        const extendedEnd = endOfWeek(addWeeks(endDate, 2));
        await fetchEventsForDateRange(extendedStart, extendedEnd, true); // forceRefresh = true
      } else if (view === 'Week') {
        const startDate = startOfWeek(date);
        const endDate = endOfWeek(date);
        // Extend range to include previous and next week
        const extendedStart = startOfWeek(subWeeks(date, 1));
        const extendedEnd = endOfWeek(addWeeks(date, 1));
        await fetchEventsForDateRange(extendedStart, extendedEnd, true); // forceRefresh = true
      } else if (view === 'Schedule') {
        // For schedule view, refresh current month plus/minus one month
        const startDate = startOfMonth(subMonths(date, 1));
        const endDate = endOfMonth(addMonths(date, 1));
        await fetchEventsForDateRange(startDate, endDate, true); // forceRefresh = true
      }
    } catch (error) {
      console.error('Error refreshing events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchEventsForDateRange]);

  // Function to invalidate specific event from cache and subscriptions (called by response handlers)
  const invalidateEvent = useCallback((eventId: string) => {
    // Remove from subscriptions to prevent stale data override
    setEventsToUpdate(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
    
    // Clear the event from home screen caches
    if (userId) {
      cacheManager.clearEventFromCaches(eventId);
    }
    
    console.log(`[EventContext] Invalidated event ${eventId} from cache and subscriptions`);
  }, [userId]);

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
        new Date(Math.max(...cachedDateRanges.map(r => r.end.getTime()))),
        updatedModifications
      );
      setEventOccurrences(allOccurrences);

      // TODO: Send modification to backend
      // await sendModificationToBackend(modification);

    } catch (error) {
      console.error('Error modifying recurring event:', error);
    }
  }, [eventModifications, events, cachedDateRanges]);

  // Helper function to validate if an event ID is a base event ID (not an occurrence ID)
  const isValidBaseEventId = useCallback((eventId: string): boolean => {
    // Base event IDs are MongoDB ObjectIds (24 hex characters)
    // Occurrence IDs have format: "baseId-timestamp" (e.g., "6848bb078579158f6c5b9376-2025-06-10T13:22:00.000Z")
    const mongoIdPattern = /^[0-9a-fA-F]{24}$/;
    return mongoIdPattern.test(eventId);
  }, []);

  // Effect to handle event updates
  useEffect(() => {
    if (eventsToUpdate.size === 0) return;
    
    // Prevent multiple simultaneous update cycles
    if (pendingFetchRef.current) {
      return;
    }

    const updateEvents = async () => {
      try {
        // Filter out invalid occurrence IDs before making API calls
        const validEventIds = Array.from(eventsToUpdate).filter(eventId => {
          const isValid = isValidBaseEventId(eventId);
          if (!isValid) {
            console.warn(`[EventContext] Filtering out invalid occurrence ID: ${eventId}`);
            // Remove invalid ID from subscriptions
            setEventsToUpdate(prev => {
              const newSet = new Set(prev);
              newSet.delete(eventId);
              return newSet;
            });
          }
          return isValid;
        });

        if (validEventIds.length === 0) {
          return; // No valid event IDs to fetch
        }

        // Fetch all valid events that need updates
        const updatePromises = validEventIds.map(async (eventId) => {
          try {
            const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
            const updatedEvent = response.data.found_event;
            
            // SECURITY: Only cache events where current user is an attendee
            if (updatedEvent && updatedEvent.attendees) {
              const currentUserIsAttendee = updatedEvent.attendees.some((attendee: { user: any; status: string }) => {
                const attendeeId = attendee.user._id || attendee.user;
                return attendeeId.toString() === userId?.toString();
              });
              
              if (!currentUserIsAttendee) {
                console.warn(`[EventContext] Filtering out event ${eventId} - user is not an attendee`);
                // Remove this event from future updates since user is no longer invited
                setEventsToUpdate(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(eventId);
                  return newSet;
                });
                return null;
              }
            }
            
            return updatedEvent;
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            // Remove problematic event ID from future updates
            setEventsToUpdate(prev => {
              const newSet = new Set(prev);
              newSet.delete(eventId);
              return newSet;
            });
            return null;
          }
        });

        const updatedEvents = await Promise.all(updatePromises);
        const validUpdatedEvents = updatedEvents.filter(Boolean);

        if (validUpdatedEvents.length > 0) {
          // Update specific events across all home screen caches
          validUpdatedEvents.forEach(updatedEvent => {
            if (updatedEvent?._id && userId) {
              cacheManager.updateEventAcrossCaches(updatedEvent._id, updatedEvent, userId);
            }
          });

          // Use atomic update to prevent race conditions with other operations
          setEvents(prevEvents => {
            const eventMap = new Map(prevEvents.map(event => [event._id, event]));
            validUpdatedEvents.forEach(updatedEvent => {
              if (updatedEvent?._id) {
                eventMap.set(updatedEvent._id, updatedEvent);
              }
            });
            
            const updatedEvents = Array.from(eventMap.values());
            
            // Update occurrences atomically within the same update cycle
            setCachedDateRanges(currentRanges => {
              if (currentRanges.length > 0) {
                const fullStartDate = new Date(Math.min(...currentRanges.map(r => r.start.getTime())));
                const fullEndDate = new Date(Math.max(...currentRanges.map(r => r.end.getTime())));

                // Re-expand all events using the updated events array
                const newOccurrences = expandEventsToOccurrences(updatedEvents, fullStartDate, fullEndDate, eventModifications);
                
                // Ensure unique occurrences
                const uniqueOccurrences = newOccurrences
                  .filter((occurrence: EventOccurrence, index: number, array: EventOccurrence[]) => {
                    return index === array.findIndex(occ => occ.id === occurrence.id);
                  })
                  .sort((a: EventOccurrence, b: EventOccurrence) => a.date.getTime() - b.date.getTime());
                
                setEventOccurrences(uniqueOccurrences);
              }
              return currentRanges;
            });
            
            return updatedEvents;
          });
        }
      } catch (error) {
        console.error('Error updating events:', error);
      }
    };

    // Only set up interval if there are events to update
    let intervalId: ReturnType<typeof setInterval> | null = null;
    
    if (eventsToUpdate.size > 0) {
      // Initial update only if we have events to update
      updateEvents();
      
      // Set interval for subsequent updates
      intervalId = setInterval(updateEvents, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [eventsToUpdate, userId]); // Added userId dependency for security check

  const subscribeToEventUpdates = useCallback((eventId: string) => {
    // Only subscribe to valid base event IDs
    if (isValidBaseEventId(eventId)) {
      setEventsToUpdate(prev => new Set([...prev, eventId]));
    } else {
      console.warn(`[EventContext] Attempted to subscribe to invalid occurrence ID: ${eventId}`);
    }
  }, [isValidBaseEventId]);

  const unsubscribeFromEventUpdates = useCallback((eventId: string) => {
    setEventsToUpdate(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });
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
    isDateRangeCached,
    invalidateEvent,
    setEvents,
    setEventOccurrences,
    expandEventsToOccurrences,
    subscribeToEventUpdates,
    unsubscribeFromEventUpdates,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}; 