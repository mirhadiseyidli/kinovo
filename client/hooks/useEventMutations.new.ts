import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import api from '@/utils/api';
import { Alert } from 'react-native';

// Event response mutation
export const useEventResponseMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe' | 'rejected';
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/respond/invitation', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate all user event lists for background refresh
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.myEvents(userId || ''),
          exact: false 
        });
      } else if (data.success) {
        // Success but no event data - remove from cache (like cancel)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.myEvents(userId || ''),
          exact: false 
        });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to respond to invitation';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Join event mutation
export const useJoinEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/join', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate user events and discovery queries
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nearby'], exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId || '') });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to join event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Cancel event mutation
export const useCancelEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/cancel/event', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success) {
        // Remove from individual cache (cancelled events shouldn't show)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        // Invalidate all relevant lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to cancel event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Mark not interested mutation
export const useMarkNotInterestedMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { eventId: string }) => {
      const response = await api.post('/api/manageevents/eventslist/not-interested', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success) {
        // Remove from cache (not interested events shouldn't show)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        // Invalidate discovery queries to remove from lists
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nearby'], exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId || '') });
        queryClient.invalidateQueries({ queryKey: queryKeys.friendsEvents(userId || '') });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to mark as not interested';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Create event mutation
export const useCreateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
      return response.data;
    },
    
    onSuccess: (data) => {
      if (data.success && data.event) {
        // Add to individual cache
        queryClient.setQueryData(queryKeys.eventById(data.event._id), data.event);
        
        // Invalidate user event lists to show new event
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Update event mutation
export const useUpdateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      updates: any;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future' | 'all_instances';
    }) => {
      const response = await api.put(`/api/manageevents/eventslist/update/${variables.eventId}`, {
        ...variables.updates,
        occurrenceDate: variables.occurrenceDate,
        modifyType: variables.modifyType
      });
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // If eventId changed (recurring event split), handle both
        if (data.updatedEventId && data.updatedEventId !== variables.eventId) {
          queryClient.setQueryData(queryKeys.eventById(data.updatedEventId), data.event);
        }
        
        // Invalidate user event lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Remove attendee mutation
export const useRemoveAttendeeMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      attendeeId: string;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/remove/attendee', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate user event lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to remove attendee';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Invite attendees mutation
export const useInviteAttendeesMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
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
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate user event lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId || ''), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to invite attendees';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};