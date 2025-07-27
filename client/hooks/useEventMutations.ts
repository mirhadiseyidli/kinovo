import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';
import { Alert } from 'react-native';
import { 
  updateEventOptimistically, 
  rollbackOptimisticUpdate, 
  predictOptimisticEventState,
  invalidateEventQueries,
  deleteEventOptimistically,
  OptimisticUpdateContext 
} from '@/utils/optimisticUpdates';
import { Event } from '@/types/allTypes';

/**
 * TanStack Query mutations for all event-related actions
 * 
 * This file contains mutations for:
 * - Responding to event invitations
 * - Joining events
 * - Marking events as not interested
 * - Canceling events
 * - Removing attendees
 * 
 * All mutations include:
 * - Optimistic updates
 * - Cache invalidation
 * - Offline support
 * - Error handling
 */

// Response to invitation mutation
export const useRespondToInvitationMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'respond'],
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe' | 'rejected';
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/respond/invitation', variables);
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // Get current event data
      const currentEvent = queryClient.getQueryData<Event>(queryKeys.eventById(variables.eventId));
      
      if (currentEvent) {
        // Predict optimistic state
        const optimisticEvent = predictOptimisticEventState(
          currentEvent, 
          'respond', 
          { userId, response: variables.status }
        );
        
        // Apply simple optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: () => {
      // Invalidate all relevant queries for background consistency
      invalidateEventQueries(queryClient, userId);
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.eventId, context.context);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to respond to invitation';
      Alert.alert('Error', errorMessage);
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

// Join event mutation
export const useJoinEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'join'],
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/join', variables);
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // Get current event data
      const currentEvent = queryClient.getQueryData<Event>(queryKeys.eventById(variables.eventId));
      
      if (currentEvent) {
        // Predict optimistic state
        const optimisticEvent = predictOptimisticEventState(
          currentEvent, 
          'join', 
          { userId, status: variables.status }
        );
        
        // Apply simple optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: () => {
      invalidateEventQueries(queryClient, userId);
      // Also invalidate nearby queries (need lat/lng parameters)
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'infinite', 'nearby'] });
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.eventId, context.context);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to join event';
      Alert.alert('Error', errorMessage);
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

// Mark not interested mutation
export const useMarkNotInterestedMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'notInterested'],
    mutationFn: async (variables: { eventId: string }) => {
      const response = await api.post('/api/manageevents/eventslist/not-interested', variables);
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // For "not interested", we remove the event from individual cache
      // Lists will be updated via invalidation
      const eventQueryKey = queryKeys.eventById(variables.eventId);
      const previousEvent = queryClient.getQueryData<Event>(eventQueryKey);
      
      // Remove the event from cache immediately
      queryClient.removeQueries({ queryKey: eventQueryKey });
      
      return { context: { previousEvent } };
    },
    
    onSuccess: () => {
      invalidateEventQueries(queryClient, userId);
      // Also invalidate nearby and friends queries
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'infinite', 'nearby'] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteFriends(userId, {}) });
      }
    },
    
    onError: (error: any, variables, context) => {
      // Restore the event if we had one
      if (context?.context?.previousEvent) {
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), context.context.previousEvent);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to mark event as not interested';
      Alert.alert('Error', errorMessage);
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

// Cancel event mutation (for event creators)
export const useCancelEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'cancel'],
    mutationFn: async (variables: {
      eventId: string;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/cancel/event', variables);
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // Get current event data
      const currentEvent = queryClient.getQueryData<Event>(queryKeys.eventById(variables.eventId));
      
      if (currentEvent) {
        // For cancel/delete, we should remove the event entirely from cache
        // This is better UX than just marking it as cancelled
        const context = deleteEventOptimistically(
          queryClient,
          variables.eventId,
          userId
        );
        
        return { context };
      }
      
      return {};
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.eventId, context.context);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel event';
      Alert.alert('Error', errorMessage);
    },
    
    onSuccess: () => {
      invalidateEventQueries(queryClient, userId);
      // Also invalidate user events and past events specifically for cancel
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userEvents(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infinitePast(userId, {}) });
      }
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

// Remove attendee mutation
export const useRemoveAttendeeMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'removeAttendee'],
    mutationFn: async (variables: {
      eventId: string;
      attendeeId: string;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/remove-attendee', variables);
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // Get current event data
      const currentEvent = queryClient.getQueryData<Event>(queryKeys.eventById(variables.eventId));
      
      if (currentEvent) {
        // Predict optimistic state (remove attendee from list)
        const optimisticEvent = {
          ...currentEvent,
          attendees: currentEvent.attendees?.filter((attendee: any) => 
            attendee.user._id !== variables.attendeeId
          ) || [],
          // If removing self, update user status
          ...(variables.attendeeId === userId && {
            isUserAttending: false,
            userStatus: undefined
          })
        };
        
        // Apply simple optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: () => {
      invalidateEventQueries(queryClient, userId);
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.eventId, context.context);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove attendee';
      Alert.alert('Error', errorMessage);
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

// Invite attendees mutation
export const useInviteAttendeesMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'inviteAttendees'],
    mutationFn: async (variables: {
      eventId: string;
      invitees: string[];
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post(`/api/manageevents/eventslist/${variables.eventId}/invite`, {
        invitees: variables.invitees,
        occurrence_start: variables.occurrenceDate,
        modifyType: variables.modifyType
      });
      return response.data;
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches for the event
      await queryClient.cancelQueries({ queryKey: queryKeys.eventById(variables.eventId) });
      
      // Get current event data for rollback
      const currentEvent = queryClient.getQueryData<Event>(queryKeys.eventById(variables.eventId));
      
      // Optimistically add new attendees with pending status
      if (currentEvent) {
        // Try to get user data from friends cache for better optimistic updates
        const friendsQuery = queryClient.getQueryData(['friends', userId]) as any;
        const friendsData = friendsQuery?.pages?.flatMap((page: any) => page.friends) || [];
        
        const newAttendees = variables.invitees.map(inviteeId => {
          // Try to find user data in friends cache
          const friendData = friendsData.find((friend: any) => friend._id === inviteeId);
          
          return {
            user: friendData || { 
              _id: inviteeId,
              first_name: 'Loading...',
              last_name: '',
              profile_picture: null
            },
            status: 'pending',
            invited_by: userId
          };
        });
        
        const optimisticEvent = {
          ...currentEvent,
          attendees: [...(currentEvent.attendees || []), ...newAttendees]
        };
        
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), optimisticEvent);
      }
      
      return { previousEvent: currentEvent };
    },
    
    onSuccess: (data, variables) => {
      // Update the event cache with the full server response if available
      if (data && data.event) {
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
      }
      
      // Invalidate all relevant queries
      invalidateEventQueries(queryClient, userId);
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates on error
      if (context?.previousEvent) {
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), context.previousEvent);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to invite attendees';
      Alert.alert('Error', errorMessage);
    },
    
    retry: 3,
    networkMode: 'offlineFirst',
  });
};

/**
 * Convenience hook that provides all event mutations
 * This maintains backward compatibility with useEventInvitation
 */
export const useEventMutations = () => {
  const respondMutation = useRespondToInvitationMutation();
  const joinMutation = useJoinEventMutation();
  const notInterestedMutation = useMarkNotInterestedMutation();
  const cancelMutation = useCancelEventMutation();
  const removeAttendeeMutation = useRemoveAttendeeMutation();
  const inviteAttendeesMutation = useInviteAttendeesMutation();

  return {
    // Maintain backward compatibility with async functions
    respondToInvitation: respondMutation.mutateAsync,
    joinEvent: joinMutation.mutateAsync,
    markNotInterested: notInterestedMutation.mutateAsync,
    cancelEvent: cancelMutation.mutateAsync,
    removeAttendee: removeAttendeeMutation.mutateAsync,
    inviteAttendees: inviteAttendeesMutation.mutateAsync,
    
    // Expose mutations for direct access
    respondMutation,
    joinMutation,
    notInterestedMutation,
    cancelMutation,
    removeAttendeeMutation,
    inviteAttendeesMutation,
    
    // Combined loading state
    loading: 
      respondMutation.isPending ||
      joinMutation.isPending ||
      notInterestedMutation.isPending ||
      cancelMutation.isPending ||
      removeAttendeeMutation.isPending ||
      inviteAttendeesMutation.isPending,
    
    // Combined error state
    error: 
      respondMutation.error ||
      joinMutation.error ||
      notInterestedMutation.error ||
      cancelMutation.error ||
      removeAttendeeMutation.error ||
      inviteAttendeesMutation.error,
  };
};