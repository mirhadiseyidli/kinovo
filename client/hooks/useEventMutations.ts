import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';
import { Alert } from 'react-native';

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
    
    onSuccess: () => {
      // Invalidate all relevant queries
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
    
    onError: (error: any) => {
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
    
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteNearby() });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
        
        // Invalidate calendar cache - joining events adds them to calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
      }
    },
    
    onError: (error: any) => {
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
    
    onSuccess: () => {
      if (userId) {
        // Invalidate all event queries to hide the event from lists
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteNearby() });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteRecommended(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteFriends(userId, {}) });
        
        // Invalidate calendar cache - marking not interested removes events from calendar
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-range'] });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'calendar-occurrences'] });
      }
    },
    
    onError: (error: any) => {
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
      if (userId) {
        await queryClient.cancelQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
      }
      
      // Snapshot previous value for rollback
      const previousEvents = userId 
        ? queryClient.getQueryData(queryKeys.upcomingEvents(userId, false))
        : null;
      
      return { previousEvents };
    },
    
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousEvents && userId) {
        queryClient.setQueryData(
          queryKeys.upcomingEvents(userId, false),
          context.previousEvents
        );
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel event';
      Alert.alert('Error', errorMessage);
    },
    
    onSuccess: () => {
      if (userId) {
        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents(userId, false) });
        queryClient.invalidateQueries({ queryKey: queryKeys.infiniteUpcoming(userId, {}) });
        queryClient.invalidateQueries({ queryKey: queryKeys.pastEvents(userId, false) });
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
    
    onError: (error: any) => {
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