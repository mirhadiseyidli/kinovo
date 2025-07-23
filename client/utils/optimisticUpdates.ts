import { QueryClient, InfiniteData } from '@tanstack/react-query';
import { Event, EventOccurrence } from '@/types/allTypes';
import { queryKeys } from './queryKeys';

/**
 * Optimistic Update Utilities for TanStack Query
 * 
 * Provides instant UI updates across all screens when events are modified.
 * Includes rollback mechanisms for failed mutations.
 */

export interface OptimisticUpdateContext {
  previousEvent?: Event;
  previousListData?: Record<string, any>;
  previousInfiniteData?: Record<string, any>;
  previousCalendarData?: Record<string, any>;
}

/**
 * Updates an event in array-based query data (lists, calendar arrays)
 */
const updateEventInArray = (data: Event[], eventId: string, updatedEvent: Event): Event[] => {
  return data.map(event => 
    event._id === eventId ? { ...event, ...updatedEvent } : event
  );
};

/**
 * Updates an event in infinite query data structure
 */
const updateEventInInfiniteData = (
  data: InfiniteData<any> | undefined,
  eventId: string,
  updatedEvent: Event
): InfiniteData<any> | undefined => {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      events: page.events ? updateEventInArray(page.events, eventId, updatedEvent) : page.events,
      data: page.data ? updateEventInArray(page.data, eventId, updatedEvent) : page.data,
    }))
  };
};

/**
 * Updates an event in calendar occurrence data
 */
const updateEventInOccurrences = (
  data: EventOccurrence[] | undefined,
  eventId: string,
  updatedEvent: Event
): EventOccurrence[] | undefined => {
  if (!data) return data;

  return data.map(occurrence => 
    occurrence.event._id === eventId 
      ? { ...occurrence, event: { ...occurrence.event, ...updatedEvent } }
      : occurrence
  );
};

/**
 * Removes an event from array-based query data
 */
const removeEventFromArray = (data: Event[], eventId: string): Event[] => {
  return data.filter(event => event._id !== eventId);
};

/**
 * Removes an event from infinite query data structure
 */
const removeEventFromInfiniteData = (
  data: InfiniteData<any> | undefined,
  eventId: string
): InfiniteData<any> | undefined => {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      events: page.events ? removeEventFromArray(page.events, eventId) : page.events,
      data: page.data ? removeEventFromArray(page.data, eventId) : page.data,
    }))
  };
};

/**
 * Removes an event from calendar occurrence data
 */
const removeEventFromOccurrences = (
  data: EventOccurrence[] | undefined,
  eventId: string
): EventOccurrence[] | undefined => {
  if (!data) return data;
  return data.filter(occurrence => occurrence.event._id !== eventId);
};

/**
 * Adds an event to the beginning of array-based query data
 */
const addEventToArray = (data: Event[], newEvent: Event): Event[] => {
  return [newEvent, ...data];
};

/**
 * Adds an event to the first page of infinite query data
 */
const addEventToInfiniteData = (
  data: InfiniteData<any> | undefined,
  newEvent: Event
): InfiniteData<any> | undefined => {
  if (!data || !data.pages.length) return data;

  const updatedPages = [...data.pages];
  const firstPage = updatedPages[0];
  
  if (firstPage.events) {
    updatedPages[0] = { ...firstPage, events: addEventToArray(firstPage.events, newEvent) };
  } else if (firstPage.data) {
    updatedPages[0] = { ...firstPage, data: addEventToArray(firstPage.data, newEvent) };
  }

  return { ...data, pages: updatedPages };
};

/**
 * Main optimistic update function for event modifications
 */
export const updateEventOptimistically = (
  queryClient: QueryClient,
  eventId: string,
  updatedEvent: Partial<Event>,
  userId?: string
): OptimisticUpdateContext => {
  const context: OptimisticUpdateContext = {
    previousListData: {},
    previousInfiniteData: {},
    previousCalendarData: {},
  };

  // 1. Update individual event cache
  const eventQueryKey = queryKeys.eventById(eventId);
  const previousEvent = queryClient.getQueryData<Event>(eventQueryKey);
  context.previousEvent = previousEvent;
  
  if (previousEvent) {
    const newEventData = { ...previousEvent, ...updatedEvent };
    queryClient.setQueryData(eventQueryKey, newEventData);

    // 2. Update all relevant list queries
    if (userId) {
      // Upcoming events
      const upcomingKey = queryKeys.upcomingEvents(userId, false);
      const upcomingData = queryClient.getQueryData<Event[]>(upcomingKey);
      if (upcomingData) {
        context.previousListData[upcomingKey.join('|')] = upcomingData;
        queryClient.setQueryData(upcomingKey, updateEventInArray(upcomingData, eventId, newEventData));
      }

      // Past events
      const pastKey = queryKeys.pastEvents(userId);
      const pastData = queryClient.getQueryData<Event[]>(pastKey);
      if (pastData) {
        context.previousListData[pastKey.join('|')] = pastData;
        queryClient.setQueryData(pastKey, updateEventInArray(pastData, eventId, newEventData));
      }

      // Attention required events
      const attentionKey = queryKeys.attentionRequiredEvents(userId, false);
      const attentionData = queryClient.getQueryData<Event[]>(attentionKey);
      if (attentionData) {
        context.previousListData[attentionKey.join('|')] = attentionData;
        queryClient.setQueryData(attentionKey, updateEventInArray(attentionData, eventId, newEventData));
      }

      // 3. Update infinite queries
      const infiniteQueries = [
        queryKeys.infiniteUpcoming(userId, {}),
        queryKeys.infinitePast(userId, {}),
        queryKeys.infiniteFriends(userId, {}),
        queryKeys.infiniteRecommended(userId, {}),
      ];

      infiniteQueries.forEach(queryKey => {
        const infiniteData = queryClient.getQueryData<InfiniteData<any>>(queryKey);
        if (infiniteData) {
          context.previousInfiniteData![queryKey.join('|')] = infiniteData;
          queryClient.setQueryData(queryKey, updateEventInInfiniteData(infiniteData, eventId, newEventData));
        }
      });

      // 4. Update calendar queries
      const calendarKeys = [
        [...queryKeys.all, 'calendar-range'],
        [...queryKeys.all, 'calendar-occurrences'],
      ];

      calendarKeys.forEach(baseKey => {
        queryClient.getQueryCache().findAll({ queryKey: baseKey }).forEach(query => {
          const queryKey = query.queryKey;
          const data = query.state.data;
          
          if (data) {
            context.previousCalendarData![queryKey.join('|')] = data;
            
            if (Array.isArray(data)) {
              // Calendar events array
              queryClient.setQueryData(queryKey, updateEventInArray(data, eventId, newEventData));
            } else if (data && typeof data === 'object' && 'pages' in data) {
              // Calendar infinite data
              queryClient.setQueryData(queryKey, updateEventInInfiniteData(data as InfiniteData<any>, eventId, newEventData));
            } else if (Array.isArray(data)) {
              // Calendar occurrences
              queryClient.setQueryData(queryKey, updateEventInOccurrences(data, eventId, newEventData));
            }
          }
        });
      });
    }
  }

  return context;
};

/**
 * Optimistic delete function
 */
export const deleteEventOptimistically = (
  queryClient: QueryClient,
  eventId: string,
  userId?: string
): OptimisticUpdateContext => {
  const context: OptimisticUpdateContext = {
    previousListData: {},
    previousInfiniteData: {},
    previousCalendarData: {},
  };

  // 1. Store and remove individual event
  const eventQueryKey = queryKeys.eventById(eventId);
  const previousEvent = queryClient.getQueryData<Event>(eventQueryKey);
  context.previousEvent = previousEvent;
  queryClient.removeQueries({ queryKey: eventQueryKey });

  if (userId) {
    // 2. Remove from all list queries
    const listQueries = [
      queryKeys.upcomingEvents(userId, false),
      queryKeys.pastEvents(userId),
      queryKeys.attentionRequiredEvents(userId, false),
    ];

    listQueries.forEach(queryKey => {
      const data = queryClient.getQueryData<Event[]>(queryKey);
      if (data) {
        context.previousListData![queryKey.join('|')] = data;
        queryClient.setQueryData(queryKey, removeEventFromArray(data, eventId));
      }
    });

    // 3. Remove from infinite queries
    const infiniteQueries = [
      queryKeys.infiniteUpcoming(userId, {}),
      queryKeys.infinitePast(userId, {}),
      queryKeys.infiniteFriends(userId, {}),
      queryKeys.infiniteRecommended(userId, {}),
    ];

    infiniteQueries.forEach(queryKey => {
      const infiniteData = queryClient.getQueryData<InfiniteData<any>>(queryKey);
      if (infiniteData) {
        context.previousInfiniteData![queryKey.join('|')] = infiniteData;
        queryClient.setQueryData(queryKey, removeEventFromInfiniteData(infiniteData, eventId));
      }
    });

    // 4. Remove from calendar queries
    const calendarKeys = [
      [...queryKeys.all, 'calendar-range'],
      [...queryKeys.all, 'calendar-occurrences'],
    ];

    calendarKeys.forEach(baseKey => {
      queryClient.getQueryCache().findAll({ queryKey: baseKey }).forEach(query => {
        const queryKey = query.queryKey;
        const data = query.state.data;
        
        if (data) {
          context.previousCalendarData![queryKey.join('|')] = data;
          
          if (Array.isArray(data)) {
            queryClient.setQueryData(queryKey, removeEventFromArray(data, eventId));
          } else if (data && typeof data === 'object' && 'pages' in data) {
            queryClient.setQueryData(queryKey, removeEventFromInfiniteData(data as InfiniteData<any>, eventId));
          }
        }
      });
    });
  }

  return context;
};

/**
 * Optimistic create function
 */
export const createEventOptimistically = (
  queryClient: QueryClient,
  newEvent: Event,
  userId?: string
): OptimisticUpdateContext => {
  const context: OptimisticUpdateContext = {
    previousListData: {},
    previousInfiniteData: {},
  };

  if (userId) {
    // 1. Add to individual event cache
    queryClient.setQueryData(queryKeys.eventById(newEvent._id), newEvent);

    // 2. Add to relevant list queries (typically upcoming events for new events)
    const upcomingKey = queryKeys.upcomingEvents(userId, false);
    const upcomingData = queryClient.getQueryData<Event[]>(upcomingKey);
    if (upcomingData) {
      context.previousListData![upcomingKey.join('|')] = upcomingData;
      queryClient.setQueryData(upcomingKey, addEventToArray(upcomingData, newEvent));
    }

    // 3. Add to infinite upcoming query
    const infiniteUpcomingKey = queryKeys.infiniteUpcoming(userId, {});
    const infiniteData = queryClient.getQueryData<InfiniteData<any>>(infiniteUpcomingKey);
    if (infiniteData) {
      context.previousInfiniteData![infiniteUpcomingKey.join('|')] = infiniteData;
      queryClient.setQueryData(infiniteUpcomingKey, addEventToInfiniteData(infiniteData, newEvent));
    }
  }

  return context;
};

/**
 * Rollback function to restore previous state on mutation failure
 */
export const rollbackOptimisticUpdate = (
  queryClient: QueryClient,
  eventId: string,
  context: OptimisticUpdateContext
): void => {
  // 1. Restore individual event
  if (context.previousEvent) {
    queryClient.setQueryData(queryKeys.eventById(eventId), context.previousEvent);
  }

  // 2. Restore list data
  if (context.previousListData) {
    Object.entries(context.previousListData).forEach(([keyString, data]) => {
      const queryKey = keyString.split('|');
      queryClient.setQueryData(queryKey, data);
    });
  }

  // 3. Restore infinite data
  if (context.previousInfiniteData) {
    Object.entries(context.previousInfiniteData).forEach(([keyString, data]) => {
      const queryKey = keyString.split('|');
      queryClient.setQueryData(queryKey, data);
    });
  }

  // 4. Restore calendar data
  if (context.previousCalendarData) {
    Object.entries(context.previousCalendarData).forEach(([keyString, data]) => {
      const queryKey = keyString.split('|');
      queryClient.setQueryData(queryKey, data);
    });
  }
};

/**
 * Utility to predict optimistic event state for different mutation types
 */
export const predictOptimisticEventState = (
  currentEvent: Event,
  mutationType: 'join' | 'leave' | 'respond' | 'cancel' | 'update',
  mutationData?: any
): Partial<Event> => {
  const userId = mutationData?.userId;
  
  switch (mutationType) {
    case 'join':
      return {
        ...currentEvent,
        isUserAttending: true,
        userStatus: 'accepted',
        attendees: [
          ...currentEvent.attendees,
          { user: { _id: userId }, status: 'accepted' }
        ]
      };
      
    case 'leave':
      return {
        ...currentEvent,
        isUserAttending: false,
        userStatus: null,
        attendees: currentEvent.attendees.filter(
          (attendee: any) => attendee.user._id !== userId
        )
      };
      
    case 'respond':
      const responseStatus = mutationData?.response;
      return {
        ...currentEvent,
        isUserAttending: responseStatus === 'accepted',
        userStatus: responseStatus,
        attendees: currentEvent.attendees.map((attendee: any) =>
          attendee.user._id === userId 
            ? { ...attendee, status: responseStatus }
            : attendee
        )
      };
      
    case 'cancel':
      return {
        ...currentEvent,
        status: 'cancelled'
      };
      
    case 'update':
      return {
        ...currentEvent,
        ...mutationData
      };
      
    default:
      return currentEvent;
  }
};