import { useAuthSession } from '@/components/Auth/AuthProvider';
import { Event } from '@/types/allTypes';
import { 
  useCreateEventMutation as useCreateEventMutationCrud,
  useUpdateEventMutation as useUpdateEventMutationCrud,
  useDeleteEventMutation as useDeleteEventMutationCrud,
  useJoinEventMutation as useJoinEventMutationCrud,
  useLeaveEventMutation as useLeaveEventMutationCrud,
  CreateEventData,
  UpdateEventData,
  CrudMutationConfig,
} from './useCrudMutations';

/**
 * Typed mutation hooks using the mutation factory
 * 
 * These hooks demonstrate how to use the typed mutation factory with
 * discriminated union types, optimistic updates, and rollback functionality.
 */

// Event creation hook with optimistic updates (using the new CRUD mutations)
export const useCreateEventMutation = (config: CrudMutationConfig = {}) => {
  const { userId } = useAuthSession();
  return useCreateEventMutationCrud({ ...config, userId });
};

// Event update hook with optimistic updates (using the new CRUD mutations)
export const useUpdateEventMutation = (config: CrudMutationConfig = {}) => {
  const { userId } = useAuthSession();
  return useUpdateEventMutationCrud({ ...config, userId });
};

// Event deletion hook with optimistic updates (using the new CRUD mutations)
export const useDeleteEventMutation = (config: CrudMutationConfig = {}) => {
  const { userId } = useAuthSession();
  return useDeleteEventMutationCrud({ ...config, userId });
};

// Join event hook with optimistic updates
export const useJoinEventMutation = (config: CrudMutationConfig = {}) => {
  const { userId } = useAuthSession();
  return useJoinEventMutationCrud({ ...config, userId });
};

// Leave event hook with optimistic updates
export const useLeaveEventMutation = (config: CrudMutationConfig = {}) => {
  const { userId } = useAuthSession();
  return useLeaveEventMutationCrud({ ...config, userId });
};

/**
 * Advanced event mutation hook with custom validation logic
 */
export const useAdvancedEventMutation = () => {
  // Create the mutation hook
  const createEventMutation = useCreateEventMutation();
  
  // Enhanced mutation with additional logic
  const createEventWithValidation = async (eventData: Partial<Event>) => {
    // Pre-mutation validation
    if (!eventData.title?.trim()) {
      throw new Error('Event title is required');
    }
    
    if (!eventData.start_time || new Date(eventData.start_time) < new Date()) {
      throw new Error('Event start time must be in the future');
    }

    // Convert to CreateEventData format
    const createData: CreateEventData = {
      title: eventData.title,
      description: eventData.description || '',
      start_time: eventData.start_time,
      end_time: eventData.end_time || eventData.start_time,
      location: {
        text: eventData.location?.text || 'TBD',
        city: eventData.location?.city,
        state: eventData.location?.state,
        coordinates: eventData.location?.coordinates || { lat: null, lng: null }
      },
      category: eventData.category || 'other',
      visibility: eventData.visibility || 'public',
      maxParticipants: eventData.maxParticipants,
      images: eventData.images,
      isRecurring: eventData.isRecurring,
      recurringPattern: eventData.recurringPattern,
      participants: eventData.participants,
    };
    
    // Execute mutation
    return createEventMutation.mutateAsync(createData);
  };
  
  // Get status information based on mutation state
  const getDetailedState = () => {
    if (createEventMutation.isPending) {
      return {
        type: 'loading' as const,
        message: 'Creating event...',
        canProceed: false,
      };
    }
    
    if (createEventMutation.isError) {
      return {
        type: 'error' as const,
        error: createEventMutation.error,
        message: `Failed to create event: ${createEventMutation.error?.message || 'Unknown error'}`,
        canRetry: true,
        canProceed: false,
      };
    }
    
    if (createEventMutation.isSuccess) {
      return {
        type: 'success' as const,
        data: createEventMutation.data,
        message: `Event created successfully`,
        canProceed: true,
      };
    }
    
    return {
      type: 'idle' as const,
      message: 'Ready to create event',
      canProceed: true,
    };
  };
  
  return {
    // Mutation methods
    createEvent: createEventWithValidation,
    createEventSync: createEventMutation.mutate,
    reset: createEventMutation.reset,
    
    // State information
    detailedState: getDetailedState(),
    
    // Convenience getters
    isLoading: createEventMutation.isPending,
    isSuccess: createEventMutation.isSuccess,
    isError: createEventMutation.isError,
    
    // Data access
    data: createEventMutation.data,
    error: createEventMutation.error,
    
    // Raw mutation for advanced use cases
    rawMutation: createEventMutation,
  };
};

/**
 * Hook for batch event operations
 */
export const useBatchEventMutations = () => {
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();
  
  // Batch create multiple events
  const createMultipleEvents = async (events: Partial<Event>[]) => {
    const results = [];
    
    for (const event of events) {
      try {
        // Convert to CreateEventData format
        const createData: CreateEventData = {
          title: event.title || 'Untitled Event',
          description: event.description || '',
          start_time: event.start_time || new Date(),
          end_time: event.end_time || event.start_time || new Date(),
          location: {
            text: event.location?.text || 'TBD',
            city: event.location?.city,
            state: event.location?.state,
            coordinates: event.location?.coordinates || { lat: null, lng: null }
          },
          category: event.category || 'other',
          visibility: event.visibility || 'public',
          maxParticipants: event.maxParticipants,
          images: event.images,
          isRecurring: event.isRecurring,
          recurringPattern: event.recurringPattern,
          participants: event.participants,
        };
        
        const result = await createMutation.mutateAsync(createData);
        results.push({ success: true, data: result, event });
      } catch (error) {
        results.push({ success: false, error, event });
      }
    }
    
    return results;
  };
  
  // Batch update multiple events
  const updateMultipleEvents = async (updates: Array<{ eventId: string; updates: Partial<Event> }>) => {
    const results = [];
    
    for (const update of updates) {
      try {
        // Convert to UpdateEventData format
        const updateData: UpdateEventData = {
          id: update.eventId,
          title: update.updates.title || 'Untitled Event',
          description: update.updates.description || '',
          start_time: update.updates.start_time || undefined,
          end_time: update.updates.end_time || undefined,
          location: update.updates.location ? {
            text: update.updates.location.text || 'TBD',
            city: update.updates.location.city,
            state: update.updates.location.state,
            coordinates: update.updates.location.coordinates || { lat: null, lng: null }
          } : {
            text: 'TBD',
            city: null,
            state: null,
            coordinates: { lat: null, lng: null }
          },
          category: update.updates.category || 'other',
          visibility: update.updates.visibility || 'public',
          maxParticipants: update.updates.maxParticipants,
          images: update.updates.images,
          isRecurring: update.updates.isRecurring,
          recurringPattern: update.updates.recurringPattern,
          participants: update.updates.participants,
        };
        
        const result = await updateMutation.mutateAsync(updateData);
        results.push({ success: true, data: result, update });
      } catch (error) {
        results.push({ success: false, error, update });
      }
    }
    
    return results;
  };
  
  // Get combined state
  const getCombinedState = () => {
    const hasLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
    const hasError = createMutation.isError || updateMutation.isError || deleteMutation.isError;
    const allSuccess = createMutation.isSuccess && updateMutation.isSuccess && deleteMutation.isSuccess;
    
    return {
      isLoading: hasLoading,
      hasError,
      allSuccess,
      errors: {
        create: createMutation.error,
        update: updateMutation.error,
        delete: deleteMutation.error,
      },
    };
  };
  
  return {
    // Batch operations
    createMultipleEvents,
    updateMultipleEvents,
    
    // Individual mutations
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    
    // Combined state
    combinedState: getCombinedState(),
    
    // Individual states
    isCreateLoading: createMutation.isPending,
    isUpdateLoading: updateMutation.isPending,
    isDeleteLoading: deleteMutation.isPending,
    
    // Reset all
    resetAll: () => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
    },
  };
};

/**
 * Custom mutation hook for event attendance using CRUD mutations
 */
export const useEventAttendanceMutation = () => {
  const { userId } = useAuthSession();
  const joinMutation = useJoinEventMutation();
  const leaveMutation = useLeaveEventMutation();
  
  const updateAttendance = async (variables: { eventId: string; action: 'join' | 'leave' }) => {
    if (!userId) throw new Error('User ID is required');
    
    if (variables.action === 'join') {
      return joinMutation.mutateAsync({ eventId: variables.eventId, userId });
    } else {
      return leaveMutation.mutateAsync({ eventId: variables.eventId, userId });
    }
  };
  
  return {
    mutate: (variables: { eventId: string; action: 'join' | 'leave' }) => {
      if (variables.action === 'join') {
        joinMutation.mutate({ eventId: variables.eventId, userId: userId || '' });
      } else {
        leaveMutation.mutate({ eventId: variables.eventId, userId: userId || '' });
      }
    },
    mutateAsync: updateAttendance,
    isPending: joinMutation.isPending || leaveMutation.isPending,
    isError: joinMutation.isError || leaveMutation.isError,
    isSuccess: joinMutation.isSuccess || leaveMutation.isSuccess,
    error: joinMutation.error || leaveMutation.error,
    data: joinMutation.data || leaveMutation.data,
    reset: () => {
      joinMutation.reset();
      leaveMutation.reset();
    },
  };
};

/**
 * Hook for managing mutation UI state
 */
export const useMutationUIState = (mutations: Array<{ isPending?: boolean; isError?: boolean; isSuccess?: boolean; error?: any }>) => {
  const getUIState = () => {
    const loadingMutations = mutations.filter(m => m.isPending);
    const errorMutations = mutations.filter(m => m.isError);
    const successMutations = mutations.filter(m => m.isSuccess);
    
    const isLoading = loadingMutations.length > 0;
    const hasErrors = errorMutations.length > 0;
    const hasSuccess = successMutations.length > 0;
    
    return {
      isLoading,
      hasErrors,
      hasSuccess,
      
      // Counts
      loadingCount: loadingMutations.length,
      errorCount: errorMutations.length,
      successCount: successMutations.length,
      
      // Messages
      loadingMessage: isLoading ? `${loadingMutations.length} operation(s) in progress...` : null,
      errorMessage: hasErrors ? `${errorMutations.length} operation(s) failed` : null,
      successMessage: hasSuccess ? `${successMutations.length} operation(s) completed` : null,
      
      // Get errors
      errors: errorMutations.map(m => m.error).filter(Boolean),
    };
  };
  
  return getUIState();
};

/**
 * Example usage patterns
 */

// Example 1: Basic usage with event creation
export const useExampleEventCreation = () => {
  const mutation = useCreateEventMutation();
  
  const handleCreateEvent = async (eventData: Partial<Event>) => {
    try {
      // Convert to CreateEventData format
      const createData: CreateEventData = {
        title: eventData.title || 'Untitled Event',
        description: eventData.description || '',
        start_time: eventData.start_time || new Date(),
        end_time: eventData.end_time || eventData.start_time || new Date(),
        location: eventData.location ? {
          text: eventData.location.text || 'TBD',
          city: eventData.location.city,
          state: eventData.location.state,
          coordinates: eventData.location.coordinates || { lat: null, lng: null }
        } : {
          text: 'TBD',
          city: null,
          state: null,
          coordinates: { lat: null, lng: null }
        },
        category: eventData.category || 'other',
        visibility: eventData.visibility || 'public',
        maxParticipants: eventData.maxParticipants,
        images: eventData.images,
        isRecurring: eventData.isRecurring,
        recurringPattern: eventData.recurringPattern,
        participants: eventData.participants,
      };
      
      await mutation.mutateAsync(createData);
      
      // Handle success
      if (mutation.isSuccess && mutation.data) {
        console.log('Event created successfully');
      }
    } catch (error) {
      // Handle error
      if (mutation.isError) {
        console.error('Failed to create event:', mutation.error?.message);
      }
    }
  };
  
  return {
    createEvent: handleCreateEvent,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
};

// Example 2: UI component helper
export const useEventMutationUI = () => {
  const createMutation = useCreateEventMutation();
  const updateMutation = useUpdateEventMutation();
  const deleteMutation = useDeleteEventMutation();
  
  const uiState = useMutationUIState([
    { 
      isPending: createMutation.isPending,
      isError: createMutation.isError,
      isSuccess: createMutation.isSuccess,
      error: createMutation.error
    },
    { 
      isPending: updateMutation.isPending,
      isError: updateMutation.isError,
      isSuccess: updateMutation.isSuccess,
      error: updateMutation.error
    },
    { 
      isPending: deleteMutation.isPending,
      isError: deleteMutation.isError,
      isSuccess: deleteMutation.isSuccess,
      error: deleteMutation.error
    },
  ]);
  
  return {
    // Mutations
    createEvent: createMutation.mutate,
    updateEvent: updateMutation.mutate,
    deleteEvent: deleteMutation.mutate,
    
    // UI state
    ...uiState,
    
    // Reset all
    resetAll: () => {
      createMutation.reset();
      updateMutation.reset();
      deleteMutation.reset();
    },
  };
};