import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeEventFromCache, updateEventInCache } from '@/utils/eventCache';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useCalendarSync } from './useCalendarSync';

// Helper function to handle event response data consistently
const handleEventResponse = (responseData: any, userId?: string) => {
  // Collect all unique events to update
  const eventsToUpdate = new Map<string, Event>();
  
  // New format: Handle events array
  if (responseData.events && Array.isArray(responseData.events)) {
    responseData.events.forEach((event: Event) => {
      if (event._id) {
        eventsToUpdate.set(event._id, event);
      }
    });
  }
  
  // Legacy format: Single event
  if (responseData.event && responseData.event._id) {
    eventsToUpdate.set(responseData.event._id, responseData.event);
  }
  
  // Backward compatibility for old response format (these will be phased out)
  if (responseData.masterEvent && responseData.masterEvent._id) {
    eventsToUpdate.set(responseData.masterEvent._id, responseData.masterEvent);
  }
  if (responseData.originalEvent && responseData.originalEvent._id) {
    eventsToUpdate.set(responseData.originalEvent._id, responseData.originalEvent);
  }
  if (responseData.futureEvent && responseData.futureEvent._id) {
    eventsToUpdate.set(responseData.futureEvent._id, responseData.futureEvent);
  }
  
  // Update each unique event only once to avoid redundant invalidations
  eventsToUpdate.forEach((event) => {
    updateEventInCache(event, userId);
  });
};

// Report Event Mutation (Backend only returns success)
export const useReportEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, reason, details }: {
      eventId: string;
      reason?: string;
      details?: string;
    }) => {
      const response = await api.post(`/api/manageevents/eventslist/report`, {
        eventId,
        reason, details
      });
      return response.data; // Returns { success: true, message: "..." } ONLY
    },
    onSuccess: (_, { eventId }) => {
      // No event data returned - must remove from cache and invalidate
      removeEventFromCache(eventId);
      queryClient.invalidateQueries({ queryKey: ['events', 'single', eventId] });
    },
  });
};

// Not Interested Event Mutation (Backend only returns success)
export const useNotInterestedEvent = () => {
  return useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.post(`/api/manageevents/eventslist/not-interested`, { eventId });
      return response.data; // Returns { success: true, message: "..." } ONLY
    },
    onSuccess: (_, eventId) => {
      // No event data returned - must remove from cache
      removeEventFromCache(eventId);
    },
  });
};

// Cancel Event Mutation (Backend only returns success)
export const useCancelEvent = () => {
  const queryClient = useQueryClient();
  const { deleteEventFromCalendar } = useCalendarSync();
  
  return useMutation({
    mutationFn: async ({ eventId, occurrenceDate, modifyType }: {
      eventId: string;
      occurrenceDate?: string;
      modifyType?: string;
    }) => {
      // Get event data first to check if it's synced to calendar
      let eventToCancel: Event | null = null;
      try {
        const eventResponse = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
        // Handle both response formats: {event: ...} or {events: [...]}
        eventToCancel = eventResponse.data.event || eventResponse.data.events?.[0];
      } catch (error) {
        console.log('Could not fetch event before cancellation:', error);
      }
      
      const response = await api.post(`/api/manageevents/eventslist/cancel/event`, {
        eventId, occurrenceDate, modifyType
      });
      return { ...response.data, originalEvent: eventToCancel }; // Include event data for calendar sync
    },
    onSuccess: async (responseData, { eventId }) => {
      // Remove from calendar if it was synced
      if (responseData.originalEvent && responseData.originalEvent.iosCalendarEventId) {
        try {
          await deleteEventFromCalendar(responseData.originalEvent);
        } catch (error) {
          console.error('Failed to delete event from calendar:', error);
        }
      }
      
      // No event data returned - must remove/invalidate
      removeEventFromCache(eventId);
      // Also invalidate calendar queries
      queryClient.invalidateQueries({ queryKey: ['events', 'calendar'] });
    },
  });
};

// Remove Attendee Mutation (Backend now returns updated event via buildEnrichedEventResponse)
export const useRemoveAttendee = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ eventId, attendeeId, occurrenceDate, modifyType }: {
      eventId: string;
      attendeeId: string;
      occurrenceDate?: string;
      modifyType?: string;
    }) => {
      const response = await api.post(`/api/manageevents/eventslist/remove-attendee`, {
        eventId, attendeeId, occurrenceDate, modifyType
      });
      return response.data; // Now returns enriched event data from buildEnrichedEventResponse
    },
    onSuccess: (responseData, { eventId, attendeeId }) => {
      // Use consistent handler for all response formats
      try {
        handleEventResponse(responseData, attendeeId);
      } catch (error) {
        console.warn('Failed to handle event response, falling back to invalidation:', error);
        // Fallback to invalidation if no event data returned
        queryClient.invalidateQueries({ queryKey: ['events', 'single', eventId] });
      }
    },
  });
};