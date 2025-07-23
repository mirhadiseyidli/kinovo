import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/utils/api';
import { queryKeys } from '@/utils/queryKeys';
import { 
  updateInfiniteQueryCache, 
  removeFromInfiniteQueryCache, 
  updateInfiniteQueryCacheItem,
  invalidateInfiniteQueries 
} from '@/utils/infiniteQueryUtils';
import { Event } from '@/hooks/useInfiniteEventsQuery';
import { 
  createEventOptimistically,
  updateEventOptimistically, 
  deleteEventOptimistically,
  rollbackOptimisticUpdate
} from '@/utils/optimisticUpdates';

/**
 * CRUD Mutation Hooks for Events
 * 
 * This module provides comprehensive CRUD operations with:
 * - Optimistic updates for immediate UI feedback
 * - Automatic cache invalidation and updates
 * - Proper error handling and rollback mechanisms
 * - TypeScript support for type safety
 * - Integration with infinite queries
 */

// Base event data interfaces
export interface CreateEventData {
  title: string;
  description: string;
  start_time: string | Date;
  end_time: string | Date;
  location: {
    text: string | null;
    city: string | null | undefined;
    state: string | null | undefined;
    coordinates: {
      lat: number | null;
      lng: number | null;
    };
  };
  category: string;
  visibility: string;
  maxParticipants?: number;
  images?: string[];
  isRecurring?: boolean;
  recurringPattern?: any;
  is_recurring?: boolean;
  recurring_pattern?: any;
  participants?: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export interface DeleteEventData {
  id: string;
}

export interface JoinEventData {
  eventId: string;
  userId: string;
}

export interface LeaveEventData {
  eventId: string;
  userId: string;
}

// Response interfaces
export interface CreateEventResponse extends Event {
  success: boolean;
  message?: string;
}

export interface UpdateEventResponse extends Event {
  success: boolean;
  message?: string;
}

export interface DeleteEventResponse {
  success: boolean;
  message?: string;
  deletedEventId: string;
}

export interface JoinEventResponse {
  success: boolean;
  message?: string;
  event: Event;
}

export interface LeaveEventResponse {
  success: boolean;
  message?: string;
  event: Event;
}

// Mutation configuration interface
export interface CrudMutationConfig {
  userId?: string;
  enableOptimisticUpdates?: boolean;
  invalidateQueries?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onSettled?: () => void;
}

/**
 * Create Event Mutation Hook
 */
export const useCreateEventMutation = (config: CrudMutationConfig = {}) => {
  const queryClient = useQueryClient();
  const {
    userId,
    enableOptimisticUpdates = true,
    invalidateQueries = true,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const response = await api.post('/api/manageevents/create', {
        ...eventData,
        start_time: new Date(eventData.start_time).toISOString(),
        end_time: new Date(eventData.end_time).toISOString(),
      });
      return response.data;
    },

    onMutate: async (eventData) => {
      if (!enableOptimisticUpdates) return;

      // Create optimistic event with temporary ID
      const optimisticEvent: Event = {
        _id: `temp-${Date.now()}`,
        title: eventData.title,
        description: eventData.description,
        start_time: new Date(eventData.start_time as Date),
        end_time: new Date(eventData.end_time as Date),
        location: {
          text: eventData.location.text,
          city: eventData.location.city ?? null,
          state: eventData.location.state ?? null,
          coordinates: {
            lat: eventData.location.coordinates?.lat || null,
            lng: eventData.location.coordinates?.lng || null,
          },
        }, 
        category: eventData.category,
        visibility: eventData.visibility,
        status: 'active',
        event_picture: null,
        creator: userId ? {
          _id: userId,
          first_name: 'Current',
          last_name: 'User',
          full_name: 'Current User',
          username: 'current_user',
          email: '',
          email_verified: false,
          phone_number: {
            country_code: null,
            area_code: null,
            phone_num: null,
            full_num: null
          },
          profile_picture: '',
          created_at: new Date(),
          mutualFriendsCount: 0
        } : {
          _id: 'temp-user',
          first_name: 'Unknown',
          last_name: 'User',
          full_name: 'Unknown User',
          username: 'unknown_user',
          email: '',
          email_verified: false,
          phone_number: {
            country_code: null,
            area_code: null,
            phone_num: null,
            full_num: null
          },
          profile_picture: '',
          created_at: new Date(),
          mutualFriendsCount: 0
        },
        created_at: new Date(),
        updated_at: new Date(),
        participants: [userId || 'current-user'],
        images: eventData.images || [],
        maxParticipants: eventData.maxParticipants,
        isRecurring: eventData.isRecurring,
        recurringPattern: eventData.recurringPattern,
      };

      // Use new optimistic create function
      const context = createEventOptimistically(
        queryClient,
        optimisticEvent,
        userId
      );

      return { context, optimisticEvent };
    },

    onSuccess: (data, variables, _context) => {
      if (invalidateQueries) {
        // Invalidate relevant queries
        if (userId) {
          invalidateInfiniteQueries({ queryClient, eventType: 'upcoming', userId });
          invalidateInfiniteQueries({ queryClient, eventType: 'recommended', userId });
          
          if (variables.location.coordinates?.lat && variables.location.coordinates?.lng) {
            invalidateInfiniteQueries({ queryClient, eventType: 'nearby', userId });
          }
        }
        
        // Invalidate event counts
        queryClient.invalidateQueries({ queryKey: queryKeys.eventCount(userId || '') });
        
        // Invalidate calendar cache - new events need to appear in calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
        }
      }

      onSuccess?.(data);
    },

    onError: (error, _variables, context) => {
      // Rollback optimistic updates
      if (enableOptimisticUpdates && context?.context && context?.optimisticEvent?._id) {
        rollbackOptimisticUpdate(queryClient, context.optimisticEvent._id, context.context);
      }

      console.error('Create event mutation failed:', error);
      onError?.(error);
    },

    onSettled: () => {
      onSettled?.();
    },
  });
};

/**
 * Update Event Mutation Hook
 */
export const useUpdateEventMutation = (config: CrudMutationConfig = {}) => {
  const queryClient = useQueryClient();
  const {
    userId,
    enableOptimisticUpdates = true,
    invalidateQueries = true,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation({
    mutationFn: async (eventData: UpdateEventData) => {
      const response = await api.put(`/api/manageevents/update/${eventData.id}`, {
        ...eventData,
        start_time: eventData.start_time ? new Date(eventData.start_time as Date).toISOString() : undefined,
        end_time: eventData.end_time ? new Date(eventData.end_time as Date).toISOString() : undefined,
      });
      return response.data;
    },

    onMutate: async (eventData) => {
      if (!enableOptimisticUpdates) return;

      // Prepare optimistic update data with proper type conversion
      const optimisticUpdate: Partial<Event> = {
        // Spread all properties except dates first
        ...Object.fromEntries(
          Object.entries(eventData).filter(([key]) => key !== 'start_time' && key !== 'end_time')
        ),
        // Convert dates if provided, ensuring proper types
        ...(eventData.start_time && { 
          start_time: eventData.start_time instanceof Date 
            ? eventData.start_time 
            : new Date(eventData.start_time) 
        }),
        ...(eventData.end_time && { 
          end_time: eventData.end_time instanceof Date 
            ? eventData.end_time 
            : new Date(eventData.end_time) 
        }),
        updated_at: new Date(),
      } as Partial<Event>;

      // Use new optimistic update system
      const context = updateEventOptimistically(
        queryClient,
        eventData.id,
        optimisticUpdate,
        userId
      );

      return { context };
    },

    onSuccess: (data, variables, _context) => {
      if (invalidateQueries) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.eventById(variables.id) });
        
        if (userId) {
          invalidateInfiniteQueries({ queryClient, userId });
        }
        
        // Invalidate calendar cache - updated events need to refresh in calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
        }
      }

      onSuccess?.(data);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (enableOptimisticUpdates && context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.id, context.context);
      }

      console.error('Update event mutation failed:', error);
      onError?.(error);
    },

    onSettled: () => {
      onSettled?.();
    },
  });
};

/**
 * Delete Event Mutation Hook
 */
export const useDeleteEventMutation = (config: CrudMutationConfig = {}) => {
  const queryClient = useQueryClient();
  const {
    userId,
    enableOptimisticUpdates = true,
    invalidateQueries = true,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation({
    mutationFn: async (deleteData: DeleteEventData) => {
      const response = await api.delete(`/api/manageevents/delete/${deleteData.id}`);
      return { 
        success: true, 
        message: response.data.message || 'Event deleted successfully',
        deletedEventId: deleteData.id,
      };
    },

    onMutate: async (deleteData) => {
      if (!enableOptimisticUpdates) return;

      // Use new optimistic delete function
      const context = deleteEventOptimistically(
        queryClient,
        deleteData.id,
        userId
      );

      return { context };
    },

    onSuccess: (data, variables, _context) => {
      if (invalidateQueries) {
        // Invalidate relevant queries
        if (userId) {
          invalidateInfiniteQueries({ queryClient, userId });
        }
        
        // Invalidate event counts
        queryClient.invalidateQueries({ queryKey: queryKeys.eventCount(userId || '') });
        
        // Invalidate calendar cache - deleted events need to be removed from calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
        }
      }

      onSuccess?.(data);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic delete
      if (enableOptimisticUpdates && context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.id, context.context);
      }

      console.error('Delete event mutation failed:', error);
      onError?.(error);
    },

    onSettled: () => {
      onSettled?.();
    },
  });
};

/**
 * Join Event Mutation Hook
 */
export const useJoinEventMutation = (config: CrudMutationConfig = {}) => {
  const queryClient = useQueryClient();
  const {
    userId,
    enableOptimisticUpdates = true,
    invalidateQueries = true,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation({
    mutationFn: async (joinData: JoinEventData) => {
      const response = await api.post(`/api/manageevents/join/${joinData.eventId}`, {
        userId: joinData.userId,
      });
      return response.data;
    },

    onMutate: async (joinData) => {
      if (!enableOptimisticUpdates) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(joinData.eventId) });

      // Get previous event data
      const previousEventData = queryClient.getQueryData(queryKeys.eventById(joinData.eventId));

      // Optimistically update event with new participant
      queryClient.setQueryData(queryKeys.eventById(joinData.eventId), (old: any) => {
        if (!old) return old;
        
        const participants = old.participants || [];
        if (!participants.includes(joinData.userId)) {
          return {
            ...old,
            participants: [...participants, joinData.userId],
          };
        }
        return old;
      });

      // Update in infinite query caches
      if (userId) {
        ['upcoming', 'nearby', 'friends', 'recommended'].forEach(eventType => {
          updateInfiniteQueryCacheItem(queryClient, eventType, joinData.eventId, {
            participants: [...(previousEventData as any)?.participants || [], joinData.userId],
          }, userId);
        });
      }

      return { previousEventData };
    },

    onSuccess: (data, variables, _context) => {
      if (invalidateQueries) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        if (userId) {
          invalidateInfiniteQueries({ queryClient, userId });
        }
      }

      onSuccess?.(data);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (enableOptimisticUpdates && context && context.previousEventData) {
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), context.previousEventData);
      }

      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invalidation.allEventQueries() });
      }

      console.error('Join event mutation failed:', error);
      onError?.(error);
    },

    onSettled: () => {
      onSettled?.();
    },
  });
};

/**
 * Leave Event Mutation Hook
 */
export const useLeaveEventMutation = (config: CrudMutationConfig = {}) => {
  const queryClient = useQueryClient();
  const {
    userId,
    enableOptimisticUpdates = true,
    invalidateQueries = true,
    onSuccess,
    onError,
    onSettled,
  } = config;

  return useMutation({
    mutationFn: async (leaveData: LeaveEventData) => {
      const response = await api.post(`/api/manageevents/leave/${leaveData.eventId}`, {
        userId: leaveData.userId,
      });
      return response.data;
    },

    onMutate: async (leaveData) => {
      if (!enableOptimisticUpdates) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(leaveData.eventId) });

      // Get previous event data
      const previousEventData = queryClient.getQueryData(queryKeys.eventById(leaveData.eventId));

      // Optimistically update event by removing participant
      queryClient.setQueryData(queryKeys.eventById(leaveData.eventId), (old: any) => {
        if (!old) return old;
        
        const participants = old.participants || [];
        return {
          ...old,
          participants: participants.filter((id: string) => id !== leaveData.userId),
        };
      });

      // Update in infinite query caches
      if (userId) {
        ['upcoming', 'nearby', 'friends', 'recommended'].forEach(eventType => {
          updateInfiniteQueryCacheItem(queryClient, eventType, leaveData.eventId, {
            participants: ((previousEventData as any)?.participants || []).filter((id: string) => id !== leaveData.userId),
          }, userId);
        });
      }

      return { previousEventData };
    },

    onSuccess: (data, variables, _context) => {
      if (invalidateQueries) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        if (userId) {
          invalidateInfiniteQueries({ queryClient, userId });
        }
      }

      onSuccess?.(data);
    },

    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (enableOptimisticUpdates && context && context.previousEventData) {
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), context.previousEventData);
      }

      if (invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invalidation.allEventQueries() });
      }

      console.error('Leave event mutation failed:', error);
      onError?.(error);
    },

    onSettled: () => {
      onSettled?.();
    },
  });
};

/**
 * Combined CRUD Mutations Hook
 * 
 * This hook provides all CRUD operations in a single hook for convenience
 */
export const useEventCrudMutations = (config: CrudMutationConfig = {}) => {
  const createMutation = useCreateEventMutation(config);
  const updateMutation = useUpdateEventMutation(config);
  const deleteMutation = useDeleteEventMutation(config);
  const joinMutation = useJoinEventMutation(config);
  const leaveMutation = useLeaveEventMutation(config);

  return {
    // Individual mutations
    createEvent: createMutation,
    updateEvent: updateMutation,
    deleteEvent: deleteMutation,
    joinEvent: joinMutation,
    leaveEvent: leaveMutation,

    // Combined loading state
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || joinMutation.isPending || leaveMutation.isPending,

    // Combined error state
    error: createMutation.error || updateMutation.error || deleteMutation.error || joinMutation.error || leaveMutation.error,

    // Reset all mutations
    resetAll: useCallback(() => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
      joinMutation.reset();
      leaveMutation.reset();
    }, [createMutation, updateMutation, deleteMutation, joinMutation, leaveMutation]),

    // Convenience methods
    createEventAsync: createMutation.mutateAsync,
    updateEventAsync: updateMutation.mutateAsync,
    deleteEventAsync: deleteMutation.mutateAsync,
    joinEventAsync: joinMutation.mutateAsync,
    leaveEventAsync: leaveMutation.mutateAsync,
  };
};

// Types are already exported at their declaration, no need to re-export