import React, { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { ApiError, Event } from '@/types/allTypes';
import api from '@/utils/api';
import { attentionRequiredCache, cacheManager } from '@/utils/homeScreenCache';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export const useGetAttentionRequiredEvents = () => {
  const [attentionEventsList, setAttentionEventsList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthSession();

  const fetchAttentionRequiredEvents = useCallback(async (fromHomeScreen: boolean = false, forceRefresh: boolean = false) => {
    if (!userId) {
      setError('User not authenticated');
      return [];
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cacheParams = { fromHomeScreen };
      const cachedEvents = attentionRequiredCache.get(userId, cacheParams);
      if (cachedEvents) {
        setAttentionEventsList(cachedEvents);
        setIsFirstFetch(false); // We have data, so no longer first fetch
        setHasDataBeenFetched(true);
        return cachedEvents;
      }
    }

    // If we have existing data, this is not a first fetch
    if (attentionEventsList.length > 0) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    try {
      const queryParams = fromHomeScreen ? '?from_home_screen=true' : '';
      const response = await api.get(`/api/manageevents/eventslist/get/attention/required${queryParams}`);
      
      const events = response.data.events || [];
      
      // Cache the results
      const cacheParams = { fromHomeScreen };
      attentionRequiredCache.set(userId, events, cacheParams);
      
      setAttentionEventsList(events);
      setIsFirstFetch(false); // First fetch completed
      setHasDataBeenFetched(true);
      return events;
    } catch (error) {
      const err = error as ApiError;
      console.error('❌ Failed to fetch attention required events:', err.message);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [userId, attentionEventsList.length]);

  // Clear cache for this user
  const clearCache = useCallback(() => {
    if (userId) {
      attentionRequiredCache.clear(userId);
    }
  }, [userId]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  // Listen for event clears and update state
  useEffect(() => {
    const unsubscribe = cacheManager.onEventUpdated((eventId: string, updatedEvent: Event, cacheChanges) => {
      setAttentionEventsList(prevEvents => {
        // Check if any changes affect the attention required cache
        const attentionChanges = cacheChanges.filter(change => change.cache === 'attention');
        
        if (attentionChanges.length === 0) {
          return prevEvents; // No changes to attention required events
        }
        
        let newEvents = [...prevEvents];
        
        // Handle each change type
        attentionChanges.forEach(change => {
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
    fetchAttentionRequiredEvents, 
    loading, 
    isFirstFetch,
    error, 
    clearCache,
    attentionEventsList 
  };
}; 