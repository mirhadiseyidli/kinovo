import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';
import { Alert } from 'react-native';
import { 
  updateEventOptimistically, 
  deleteEventOptimistically,
  rollbackOptimisticUpdate, 
  predictOptimisticEventState,
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
        
        // Apply optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent,
          userId
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: () => {
      // Background refetch for eventual consistency - optimistic updates already applied
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.attentionRequiredEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteEvents('attention-required', {}) });
        
        // Invalidate calendar cache - event invitation responses affect calendar display
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
        queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
      }
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
        
        // Apply optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent,
          userId
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'infinite', 'nearby'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
        
        // Invalidate calendar cache - joining events adds them to calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
      }
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
      
      // For "not interested", we optimistically remove the event from all lists
      // This provides instant feedback that the event is hidden
      const context = deleteEventOptimistically(
        queryClient,
        variables.eventId,
        userId
      );
      
      return { context };
    },
    
    onSuccess: () => {
      if (userId) {
        // Background refetch for eventual consistency
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'infinite', 'nearby'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteFriends(userId, {}) });
        
        // Invalidate calendar cache - marking not interested removes events from calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
      }
    },
    
    onError: (error: any, variables, context) => {
      // Rollback optimistic deletion on error
      if (context?.context) {
        rollbackOptimisticUpdate(queryClient, variables.eventId, context.context);
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
        // Predict optimistic state (cancelled)
        const optimisticEvent = predictOptimisticEventState(
          currentEvent, 
          'cancel', 
          {}
        );
        
        // Apply optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent,
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
      if (userId) {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.pastEvents(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infinitePast(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.userEvents(userId) });
        
        // Invalidate calendar cache - canceling events removes them from calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
        queryClient.invalidateQueries({ queryKey: ['recurring-event-modifications', userId] });
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
          attendees: currentEvent.attendees.filter((attendee: any) => 
            attendee.user._id !== variables.attendeeId
          ),
          // If removing self, update user status
          ...(variables.attendeeId === userId && {
            isUserAttending: false,
            userStatus: null
          })
        };
        
        // Apply optimistic update
        const context = updateEventOptimistically(
          queryClient,
          variables.eventId,
          optimisticEvent,
          userId
        );
        
        return { context };
      }
      
      return {};
    },
    
    onSuccess: (data, variables) => {
      if (userId) {
        // Invalidate event queries
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        
        // If removing self, also invalidate attention required
        if (variables.attendeeId === userId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.attentionRequiredEvents(userId, false) });
          queryClient.invalidateQueries({ queryKey: queryKeys.infiniteEvents('attention-required', {}) });
        }
        
        // Invalidate calendar cache - removing attendees affects calendar display
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
      }
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

  return {
    // Maintain backward compatibility with async functions
    respondToInvitation: respondMutation.mutateAsync,
    joinEvent: joinMutation.mutateAsync,
    markNotInterested: notInterestedMutation.mutateAsync,
    cancelEvent: cancelMutation.mutateAsync,
    removeAttendee: removeAttendeeMutation.mutateAsync,
    
    // Expose mutations for direct access
    respondMutation,
    joinMutation,
    notInterestedMutation,
    cancelMutation,
    removeAttendeeMutation,
    
    // Combined loading state
    loading: 
      respondMutation.isPending ||
      joinMutation.isPending ||
      notInterestedMutation.isPending ||
      cancelMutation.isPending ||
      removeAttendeeMutation.isPending,
    
    // Combined error state
    error: 
      respondMutation.error ||
      joinMutation.error ||
      notInterestedMutation.error ||
      cancelMutation.error ||
      removeAttendeeMutation.error,
  };
};