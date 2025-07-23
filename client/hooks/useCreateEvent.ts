import { Alert } from 'react-native';
import { Event } from '@/types/allTypes';
import { useCreateEventMutation, useUpdateEventMutation } from './useCreateEventMutation';

// Define an interface for the update request data that includes the optional fields
interface UpdateEventRequestData extends Partial<Event> {
  occurrenceDate?: Date | string;
  modifyType?: 'this_only' | 'this_and_future' | 'all_instances';
}

/**
 * Hook for creating and updating events using TanStack Query mutations
 * 
 * This hook wraps the TanStack Query mutations to maintain backward compatibility
 * with the existing CreateEventContext while providing all the benefits of:
 * - Optimistic updates
 * - Offline support
 * - Automatic cache invalidation
 * - Error recovery
 */
export const useCreateEvent = () => {
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();

  const postCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const result = await createMutation.mutateAsync(eventData);
      return result;
    } catch (error: any) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event');
      throw error;
    }
  };

  const updateEvent = async (
    eventId: string,
    eventData: Partial<Event>,
    options?: {
      occurrenceDate?: Date | string;
      modifyType?: 'this_only' | 'this_and_future' | 'all_instances';
    }
  ) => {
    try {
      let requestData: UpdateEventRequestData = { ...eventData };
      
      // Add options if provided
      if (options?.occurrenceDate) {
        requestData.occurrenceDate = options.occurrenceDate;
      }
      if (options?.modifyType) {
        requestData.modifyType = options.modifyType;
      }
      
      const result = await updateMutation.mutateAsync({
        eventId,
        updates: requestData
      });
      return result;
    } catch (error: any) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
      throw error;
    }
  };

  return {
    postCreateEvent,
    updateEvent,
    // Also expose the mutation objects for direct access if needed
    createMutation,
    updateMutation,
    // Expose loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
};