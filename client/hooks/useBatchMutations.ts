import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchUpdateEvents } from '@/utils/eventCache';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';

interface BatchEventData {
  events: Array<{
    title: string;
    description?: string;
    start_time: string | Date;
    end_time: string | Date;
    location: {
      text: string | null;
      city?: string | null;
      state?: string | null;
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
    recurringPattern?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval?: number;
      endDate?: string | Date;
      count?: number;
    };
  }>;
}

interface BatchUpdateData {
  updates: Array<{
    id: string;
    data: Partial<Event>;
  }>;
}

// Batch Create Events Mutation - DISABLED: No batch endpoint exists
export const useBatchCreateEvents = () => {
  return useMutation<{ events: Event[]; success: boolean; message: string }, Error, BatchEventData>({
    mutationFn: async (batchData: BatchEventData) => {
      // TODO: Implement batch endpoint on server or create events sequentially
      throw new Error('Batch create endpoint not implemented on server');
    },
    onSuccess: (responseData) => {
      // Backend returns array of created events - batch add to cache
      if (responseData.events && Array.isArray(responseData.events)) {
        batchUpdateEvents(responseData.events, 'add');
      }
    },
    networkMode: 'offlineFirst',
  });
};

// Batch Update Events Mutation - DISABLED: No batch endpoint exists
export const useBatchUpdateEvents = () => {
  return useMutation<{ events: Event[]; success: boolean; message: string }, Error, BatchUpdateData>({
    mutationFn: async (batchData: BatchUpdateData) => {
      // TODO: Implement batch endpoint on server or update events sequentially
      throw new Error('Batch update endpoint not implemented on server');
    },
    onSuccess: (responseData) => {
      // Backend returns array of updated events - batch update cache
      if (responseData.events && Array.isArray(responseData.events)) {
        batchUpdateEvents(responseData.events, 'update');
      }
    },
    networkMode: 'offlineFirst',
  });
};

// Batch Delete Events Mutation - DISABLED: No batch endpoint exists
export const useBatchDeleteEvents = () => {
  const queryClient = useQueryClient();
  
  return useMutation<{ success: boolean; message: string; deletedEventIds: string[] }, Error, string[]>({
    mutationFn: async (eventIds: string[]) => {
      // TODO: Implement batch endpoint on server or delete events sequentially
      throw new Error('Batch delete endpoint not implemented on server');
    },
    onSuccess: (_, eventIds) => {
      // No event data returned for deletes - remove from cache
      batchUpdateEvents(eventIds.map(id => ({ _id: id } as Event)), 'remove');
      // Also invalidate calendar queries since they might cache the events
      queryClient.invalidateQueries({ queryKey: ['events', 'calendar'] });
    },
    networkMode: 'offlineFirst',
  });
};

// Combined batch operations hook
export const useBatchMutations = () => {
  const createMutation = useBatchCreateEvents();
  const updateMutation = useBatchUpdateEvents();
  const deleteMutation = useBatchDeleteEvents();

  return {
    batchCreate: createMutation.mutateAsync,
    batchUpdate: updateMutation.mutateAsync,
    batchDelete: deleteMutation.mutateAsync,
    
    // Expose mutations for direct access
    createMutation,
    updateMutation,
    deleteMutation,
    
    // Combined loading state
    loading: 
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    
    // Combined error state
    error: 
      createMutation.error ||
      updateMutation.error ||
      deleteMutation.error,
  };
};