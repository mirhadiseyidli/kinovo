import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { upcomingEventsCache, cacheManager } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetMyEvents = () => {
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthSession();
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const fetchMyEvents = useCallback(async (fromHomeScreen: boolean = false, forceRefresh: boolean = false) => {
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheParams = { fromHomeScreen };
      const cachedEvents = upcomingEventsCache.get(userId, cacheParams);
      if (cachedEvents) {
        setMyEventsList(cachedEvents);
        setIsFirstFetch(false); // We have data, so no longer first fetch
        return cachedEvents;
      }
    }

    // If we have existing data, this is not a first fetch
    if (myEventsList.length > 0) {
      setIsFirstFetch(false);
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    try {
      const queryParams = fromHomeScreen ? '?from_home_screen=true' : '';
      const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events${queryParams}`, {
        signal: abortControllerRef.current.signal
      });
      
      const events = response.data.events || [];
      
      // Cache the results
      const cacheParams = { fromHomeScreen };
      upcomingEventsCache.set(userId, events, cacheParams);
      
      if (mountedRef.current) {
        setMyEventsList(events);
      }
      setIsFirstFetch(false); // First fetch completed
      return events;
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return [];
      }
      
      console.error('❌ Failed to fetch upcoming events:', err.message);
      if (mountedRef.current) {
        setError(err.message);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, myEventsList.length]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      upcomingEventsCache.clear(userId);
    }
  }, [userId]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
    }
  }, [userId]);

  // Listen for event clears and update state
  useEffect(() => {
    const unsubscribe = cacheManager.onEventUpdated((eventId: string, updatedEvent: Event, cacheChanges) => {
      setMyEventsList(prevEvents => {
        // Check if any changes affect the upcoming events cache
        const upcomingChanges = cacheChanges.filter(change => change.cache === 'upcoming');
        
        if (upcomingChanges.length === 0) {
          return prevEvents; // No changes to upcoming events
        }
        
        let newEvents = [...prevEvents];
        
        // Handle each change type
        upcomingChanges.forEach(change => {
          if (change.action === 'removed') {
            // Remove the event
            newEvents = newEvents.filter(event => 
              event._id !== eventId && event.originalEventId !== eventId
            );
          } else if (change.action === 'added') {
            // Add the event if it doesn't exist
            const exists = newEvents.some(event => 
              event._id === eventId || event.originalEventId === eventId
            );
            if (!exists) {
              newEvents.push(updatedEvent);
              // Sort by start_time to maintain order
              newEvents.sort((a, b) => {
                const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
                const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
                return aTime - bTime;
              });
            }
          } else if (change.action === 'updated') {
            // Update the existing event
            newEvents = newEvents.map(event => {
              if (event._id === eventId || event.originalEventId === eventId) {
                return updatedEvent;
              }
              return event;
            });
          }
        });
        
        return newEvents;
      });
    });

    return unsubscribe;
  }, []);

  return { 
    fetchMyEvents, 
    refetchMyEvents: fetchMyEvents, 
    loading, 
    isFirstFetch,
    error, 
    clearCache,
    myEventsList 
  };
};