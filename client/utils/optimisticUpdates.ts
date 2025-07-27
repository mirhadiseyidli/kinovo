import { QueryClient } from '@tanstack/react-query';
import { Event } from '@/types/allTypes';
import { queryKeys } from './queryKeys';

/**
 * Simplified Optimistic Updates for TanStack Query
 * 
 * This approach focuses on reliability over complexity:
 * 1. Update the individual event cache immediately
 * 2. Let invalidation handle list updates naturally
 * 3. Provide rollback for failures
 */

export interface OptimisticUpdateContext {
  previousEvent?: Event;
}

/**
 * Simple optimistic update for individual events
 * Updates the specific event cache and returns rollback context
 */
export const updateEventOptimistically = (
  queryClient: QueryClient,
  eventId: string,
  updatedEvent: Partial<Event>
): OptimisticUpdateContext => {
  // Update individual event cache
  const eventQueryKey = queryKeys.eventById(eventId);
  const previousEvent = queryClient.getQueryData<Event>(eventQueryKey);
  
  if (previousEvent) {
    const newEventData = { ...previousEvent, ...updatedEvent };
    queryClient.setQueryData(eventQueryKey, newEventData);
  }

  return { previousEvent };
};

/**
 * Rollback function to restore previous state on mutation failure
 */
export const rollbackOptimisticUpdate = (
  queryClient: QueryClient,
  eventId: string,
  context: OptimisticUpdateContext
): void => {
  if (context.previousEvent) {
    queryClient.setQueryData(queryKeys.eventById(eventId), context.previousEvent);
  }
};

/**
 * Predict optimistic event state for different mutation types
 */
export const predictOptimisticEventState = (
  _currentEvent: Event,
  mutationType: 'join' | 'leave' | 'respond' | 'cancel',
  mutationData?: any
): Partial<Event> => {
  
  switch (mutationType) {
    case 'join':
      const joinStatus = mutationData?.status || 'accepted';
      return {
        userStatus: joinStatus,
      };
      
    case 'leave':
      return {
        userStatus: undefined,
      };
      
    case 'respond':
      const responseStatus = mutationData?.response;
      return {
        userStatus: responseStatus,
      };
      
    case 'cancel':
      return {
        status: 'cancelled'
      };
      
    default:
      return {};
  }
};

/**
 * Invalidate all relevant queries for an event update
 * This handles the complex logic of what queries need to be updated
 */
export const invalidateEventQueries = (
  queryClient: QueryClient,
  userId?: string,
  excludeIndividualEvent?: boolean
): void => {
  if (!userId) return;

  // Invalidate all possible variations of list queries
  [true, false].forEach(fromHomeScreen => {
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, fromHomeScreen) });
    queryClient.invalidateQueries({ queryKey: queryKeys.attentionRequiredEvents(userId, fromHomeScreen) });
  });

  // Invalidate past events (no fromHomeScreen parameter)
  queryClient.invalidateQueries({ queryKey: queryKeys.pastEvents(userId) });
  
  // Invalidate infinite queries
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteEvents('attention-required', { userId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteFriends(userId, {}) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
  
  // Invalidate calendar cache - all calendar-related queries
  console.log('🗑️ Invalidating calendar queries...');
  queryClient.invalidateQueries({
    predicate: (query) => {
      const keyStr = JSON.stringify(query.queryKey);
      const isCalendarQuery = keyStr.includes('calendar-range') || 
                             keyStr.includes('calendar-occurrences') || 
                             keyStr.includes('"calendar"') ||
                             keyStr.includes('recurring-event-modifications');
      if (isCalendarQuery) {
        console.log('📊 Invalidating calendar query:', query.queryKey);
      }
      return isCalendarQuery;
    }
  });
};

/**
 * Invalidate queries for event updates (excludes individual events to preserve optimistic updates)
 */
export const invalidateEventQueriesForUpdate = (
  queryClient: QueryClient,
  userId?: string
): void => {
  if (!userId) return;

  // Invalidate all possible variations of list queries (but NOT individual events)
  [true, false].forEach(fromHomeScreen => {
    queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, fromHomeScreen) });
    queryClient.invalidateQueries({ queryKey: queryKeys.attentionRequiredEvents(userId, fromHomeScreen) });
  });

  // Invalidate past events (no fromHomeScreen parameter)
  queryClient.invalidateQueries({ queryKey: queryKeys.pastEvents(userId) });
  
  // Invalidate infinite queries
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteEvents('attention-required', { userId }) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteFriends(userId, {}) });
  queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
  
  // Invalidate calendar cache - all calendar-related queries
  queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
  queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
  queryClient.invalidateQueries({ queryKey: [...queryKeys.userEvents(userId), 'calendar'] });
  queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
};

/**
 * Create event optimistically - adds to lists and individual cache
 */
export const createEventOptimistically = (
  queryClient: QueryClient,
  newEvent: Event,
  userId?: string
): OptimisticUpdateContext => {
  // Add to individual event cache
  if (newEvent._id) {
    queryClient.setQueryData(queryKeys.eventById(newEvent._id), newEvent);
  }
  
  // Note: List updates will be handled by invalidation for simplicity
  return { previousEvent: undefined };
};

/**
 * Delete event optimistically - removes from lists and individual cache
 */
export const deleteEventOptimistically = (
  queryClient: QueryClient,
  eventId: string,
  userId?: string
): OptimisticUpdateContext => {
  // Get the previous event for rollback
  const previousEvent = queryClient.getQueryData<Event>(queryKeys.eventById(eventId));
  
  // Remove from individual event cache
  queryClient.removeQueries({ queryKey: queryKeys.eventById(eventId) });
  
  // Also optimistically remove from past events list if we have userId
  if (userId) {
    // Remove from regular past events query
    const pastEventsKey = queryKeys.pastEvents(userId);
    queryClient.setQueryData(pastEventsKey, (oldEvents: Event[] | undefined) => {
      if (!oldEvents) return oldEvents;
      return oldEvents.filter(event => event._id !== eventId);
    });
    
    // Remove from infinite past events query - use the correct key that matches what's in cache
    const infinitePastKey = ["events", "infinite", "past", {"pageSize": 5}];
    queryClient.setQueryData(infinitePastKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      const newPages = oldData.pages?.map((page: any) => {
        // Filter both events and past_events arrays if they exist
        const filteredEvents = page.events?.filter((event: Event) => event._id !== eventId) || [];
        const filteredPastEvents = page.past_events?.filter((event: Event) => event._id !== eventId) || [];
        
        return {
          ...page,
          events: filteredEvents,
          past_events: filteredPastEvents,
          // Update totalCount if we removed an event
          totalCount: page.totalCount && (filteredEvents.length + filteredPastEvents.length < (page.events?.length || 0) + (page.past_events?.length || 0)) 
            ? page.totalCount - 1 
            : page.totalCount
        };
      });
      
      return { ...oldData, pages: newPages };
    });
  }
  
  return { previousEvent };
};