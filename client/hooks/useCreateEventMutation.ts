import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { createEvent } from '@/utils/queryFunctions';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';

/**
 * Mutation hook for creating events with offline support
 * 
 * This hook demonstrates the offline mutation queue functionality.
 * When offline, mutations are queued and automatically retried when connectivity returns.
 */

interface CreateEventMutationContext {
  optimisticEvent?: Event;
  previousEvents?: Event[];
}

export const useCreateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'create'],
    mutationFn: createEvent,
    
    // Optimistic updates for better UX
    onMutate: async (newEvent: Partial<Event>) => {
      if (!userId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.upcomingEvents(userId, false) 
      });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false)
      );

      // Create optimistic event
      const optimisticEvent: Event = {
        _id: `temp-${Date.now()}`,
        title: newEvent.title || 'New Event',
        description: newEvent.description || '',
        start_time: newEvent.start_time || new Date(),
        end_time: newEvent.end_time || new Date(),
        location: newEvent.location || '',
        createdBy: userId,
        attendees: [userId],
        visibility: newEvent.visibility || 'public',
        category: newEvent.category || 'other',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...newEvent,
      } as Event;

      // Optimistically update the cache
      queryClient.setQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false),
        (oldEvents) => {
          if (!oldEvents) return [optimisticEvent];
          return [optimisticEvent, ...oldEvents];
        }
      );

      // Return context for rollback
      return { optimisticEvent, previousEvents } as CreateEventMutationContext;
    },

    // Rollback on error
    onError: (error, variables, context) => {
      console.error('Create event mutation failed:', error);
      
      // Rollback optimistic update
      if (context?.previousEvents && userId) {
        queryClient.setQueryData(
          queryKeys.upcomingEvents(userId, false),
          context.previousEvents
        );
      }
    },

    // Update cache on success
    onSuccess: (response, variables, context) => {
      console.log('Event created successfully:', response);
      
      // Extract the event from the response
      const newEvent = response.event;
      
      // Update the cache with the real event data
      if (userId && context?.optimisticEvent) {
        queryClient.setQueryData<Event[]>(
          queryKeys.upcomingEvents(userId, false),
          (oldEvents) => {
            if (!oldEvents) return [newEvent];
            
            // Replace the optimistic event with the real one
            return oldEvents.map(event =>
              event._id === context.optimisticEvent?._id ? newEvent : event
            );
          }
        );
      }

      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userEvents(userId || '') 
      });
      
      // Also invalidate infinite queries for upcoming events
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.infiniteUpcoming(userId || '', {}) 
      });
    },

    // Always called after success or error
    onSettled: () => {
      // Invalidate and refetch upcoming events
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.upcomingEvents(userId, false) 
        });
        
        // Also invalidate infinite queries
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.infiniteUpcoming(userId, {}) 
        });
      }
    },

    // Mutation options for offline support
    retry: 3, // Will be overridden by offline queue
    networkMode: 'offlineFirst',
    
    // Metadata for offline queue
    meta: {
      // This helps the offline queue identify the mutation type
      mutationType: 'create',
      entityType: 'event',
      // Disable automatic retries for certain errors
      skipRetryForErrors: [400, 401, 403, 422],
    },
  });
};

/**
 * Hook for updating events with offline support
 */
export const useUpdateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'update'],
    mutationFn: async (variables: { eventId: string; updates: Partial<Event> }) => {
      const { updateEvent } = await import('@/utils/queryFunctions');
      return updateEvent(variables.eventId, variables.updates);
    },

    onMutate: async (variables) => {
      if (!userId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.upcomingEvents(userId, false) 
      });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false)
      );

      // Optimistically update the cache
      queryClient.setQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false),
        (oldEvents) => {
          if (!oldEvents) return oldEvents;
          
          return oldEvents.map(event =>
            event._id === variables.eventId
              ? { ...event, ...variables.updates, updatedAt: new Date() }
              : event
          );
        }
      );

      return { previousEvents };
    },

    onError: (error, variables, context) => {
      console.error('Update event mutation failed:', error);
      
      // Rollback optimistic update
      if (context?.previousEvents && userId) {
        queryClient.setQueryData(
          queryKeys.upcomingEvents(userId, false),
          context.previousEvents
        );
      }
    },

    onSuccess: (response, variables) => {
      console.log('Event updated successfully:', response);
      
      // Extract the event from the response
      const updatedEvent = response.event;
      
      // Update cache with real data
      if (userId) {
        queryClient.setQueryData<Event[]>(
          queryKeys.upcomingEvents(userId, false),
          (oldEvents) => {
            if (!oldEvents) return oldEvents;
            
            return oldEvents.map(event =>
              event._id === variables.eventId ? updatedEvent : event
            );
          }
        );
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userEvents(userId || '') 
      });
      
      // Also invalidate infinite queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.infiniteUpcoming(userId || '', {}) 
      });
    },

    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.upcomingEvents(userId, false) 
        });
        
        // Also invalidate infinite queries
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.infiniteUpcoming(userId, {}) 
        });
      }
    },

    retry: 3,
    networkMode: 'offlineFirst',
    
    meta: {
      mutationType: 'update',
      entityType: 'event',
      skipRetryForErrors: [400, 401, 403, 404, 422],
    },
  });
};

/**
 * Hook for deleting events with offline support
 */
export const useDeleteEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'delete'],
    mutationFn: async (eventId: string) => {
      const { deleteEvent } = await import('@/utils/queryFunctions');
      return deleteEvent(eventId);
    },

    onMutate: async (eventId) => {
      if (!userId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.upcomingEvents(userId, false) 
      });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false)
      );

      // Optimistically remove the event
      queryClient.setQueryData<Event[]>(
        queryKeys.upcomingEvents(userId, false),
        (oldEvents) => {
          if (!oldEvents) return oldEvents;
          return oldEvents.filter(event => event._id !== eventId);
        }
      );

      return { previousEvents, deletedEventId: eventId };
    },

    onError: (error, variables, context) => {
      console.error('Delete event mutation failed:', error);
      
      // Rollback optimistic update
      if (context?.previousEvents && userId) {
        queryClient.setQueryData(
          queryKeys.upcomingEvents(userId, false),
          context.previousEvents
        );
      }
    },

    onSuccess: (result, eventId) => {
      console.log('Event deleted successfully:', eventId);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.userEvents(userId || '') 
      });
      
      // Also invalidate infinite queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.infiniteUpcoming(userId || '', {}) 
      });
    },

    onSettled: () => {
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.upcomingEvents(userId, false) 
        });
        
        // Also invalidate infinite queries
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.infiniteUpcoming(userId, {}) 
        });
      }
    },

    retry: 3,
    networkMode: 'offlineFirst',
    
    meta: {
      mutationType: 'delete',
      entityType: 'event',
      skipRetryForErrors: [400, 401, 403, 404, 422],
    },
  });
};