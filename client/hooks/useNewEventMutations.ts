import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEventInCache, removeEventFromCache, addEventToCache } from '@/utils/eventCache';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

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

// Use Partial<Event> directly and add the specific fields we need
interface CreateEventData extends Partial<Event> {
  // No additional constraints - Partial<Event> allows all fields to be optional
}

interface UpdateEventData extends Partial<Event> {
  eventId: string;
  occurrenceDate?: string | Date;
  modifyType?: 'this_only' | 'all_future';
}

// Create Event Mutation (Backend returns created event)
export const useCreateEvent = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      // Clean the data before sending to backend - remove fields that shouldn't be sent to API
      const cleanedData = { ...eventData };
      
      // Remove server-managed fields
      delete (cleanedData as any)._id;
      delete (cleanedData as any).creator;
      delete (cleanedData as any).created_at;
      delete (cleanedData as any).updated_at;
      delete (cleanedData as any).id;
      delete (cleanedData as any).userStatus;
      delete (cleanedData as any).isUserAttending;
      delete (cleanedData as any).isUserInvited;
      delete (cleanedData as any).isUserCreator;
      
      const response = await api.post('/api/manageevents/eventslist/create/new/event', cleanedData);
      return response.data; // Returns { event: Event, success: true, message: "..." }
    },
    onSuccess: (responseData) => {
      // Handle new events array format
      if (responseData.events && Array.isArray(responseData.events) && responseData.events.length > 0) {
        responseData.events.forEach((event: Event) => {
          addEventToCache(event, userId);
        });
      } else if (responseData.event) {
        // Legacy single event format
        addEventToCache(responseData.event, userId);
      }
    },
    networkMode: 'offlineFirst',
  });
};

// Update Event Mutation (Backend returns updated event)
export const useUpdateEvent = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, occurrenceDate, modifyType, ...updates }: UpdateEventData) => {
      // Clean the data before sending to backend
      const cleanedData = { ...updates } as any;
      
      // Remove server-managed and URL-redundant fields
      delete cleanedData._id;
      delete cleanedData.creator;
      delete cleanedData.created_at;
      delete cleanedData.updated_at;
      delete cleanedData.eventId; // Remove eventId from payload since it's in the URL
      delete cleanedData.userStatus;
      delete cleanedData.isUserAttending;
      delete cleanedData.isUserInvited;
      delete cleanedData.isUserCreator;
      
      // Add recurring event parameters if provided
      if (occurrenceDate && modifyType) {
        cleanedData.occurrenceDate = occurrenceDate;
        cleanedData.modifyType = modifyType;
      }
      
      const response = await api.put(`/api/manageevents/eventslist/update/${eventId}`, cleanedData);
      return response.data; // Returns { event: Event, success: true, message: "..." }
    },
    onSuccess: (responseData) => {
      // Handle both new events array format and legacy single event format
      handleEventResponse(responseData, userId);
    },
    networkMode: 'offlineFirst',
  });
};

// Delete Event Mutation (Uses cancel endpoint - Backend only returns success)
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (eventId: string) => {
      // Using cancel endpoint since delete doesn't exist - cancels the event
      const response = await api.post(`/api/manageevents/eventslist/cancel/event`, { eventId });
      return { ...response.data, deletedEventId: eventId };
    },
    onSuccess: (_, eventId) => {
      // No event data returned - remove from cache
      removeEventFromCache(eventId);
      // Also invalidate calendar queries since they might cache the event
      queryClient.invalidateQueries({ queryKey: ['events', 'calendar'] });
    },
    networkMode: 'offlineFirst',
  });
};

// Join Event Mutation (Backend returns updated event)
export const useJoinEvent = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const response = await api.post(`/api/manageevents/eventslist/join`, { eventId, status });
      return response.data; // Returns { event: Event, success: true, message: "..." }
    },
    onSuccess: (responseData) => {
      // Handle both new events array format and legacy single event format
      handleEventResponse(responseData, userId);
    },
    networkMode: 'offlineFirst',
  });
};

// Leave Event Mutation (Uses remove-attendee endpoint - Backend now returns updated event)  
export const useLeaveEvent = () => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      // Using remove-attendee endpoint since leave doesn't exist
      const response = await api.post(`/api/manageevents/eventslist/remove-attendee`, { eventId, attendeeId: userId });
      return response.data; // Now returns enriched event data from buildEnrichedEventResponse
    },
    onSuccess: (responseData, { eventId }) => {
      // Handle both new events array format and legacy single event format
      handleEventResponse(responseData, userId);
      
      // Fallback to invalidation if no event data returned
      if (!responseData.event && !responseData.events) {
        queryClient.invalidateQueries({ queryKey: ['events', 'single', eventId] });
      }
    },
    networkMode: 'offlineFirst',
  });
};

// Respond to Invitation Mutation (Backend returns updated event(s))
export const useRespondToInvitation = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, status, occurrenceDate, modifyType }: {
      eventId: string;
      status: string;
      occurrenceDate?: string;
      modifyType?: string;
    }) => {
      const response = await api.post(`/api/manageevents/eventslist/respond/invitation`, {
        eventId, status, occurrenceDate, modifyType
      });
      return response.data; // Returns event(s) based on modification type
    },
    onSuccess: (responseData) => {
      // Handle both new events array format and all legacy formats
      handleEventResponse(responseData, userId);
    },
    networkMode: 'offlineFirst',
  });
};

// Invite Attendees Mutation (Backend returns updated event)
export const useInviteAttendees = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, invitees, occurrenceDate, modifyType }: {
      eventId: string;
      invitees: string[];
      occurrenceDate?: string;
      modifyType?: string;
    }) => {
      const response = await api.post(`/api/manageevents/eventslist/${eventId}/invite`, {
        invitees, occurrenceDate, modifyType
      });
      
      // Return the entire response data so handleEventResponse can cache all events
      return response.data;
    },
    onSuccess: (responseData) => {
      // Handle both new events array format and legacy single event format
      handleEventResponse(responseData, userId);
    },
    networkMode: 'offlineFirst',
  });
};

// Update Event Status Mutation (Uses update endpoint - Backend returns updated event)
export const useUpdateEventStatus = () => {
  const { userId } = useAuthSession();
  
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      // Using general update endpoint since dedicated status endpoint doesn't exist
      const response = await api.put(`/api/manageevents/eventslist/update/${eventId}`, { status });
      return response.data; // Returns { event: Event, success: true, message: "..." }
    },
    onSuccess: (responseData) => {
      // Handle both new events array format and legacy single event format
      handleEventResponse(responseData, userId);
    },
    networkMode: 'offlineFirst',
  });
};