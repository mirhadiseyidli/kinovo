import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Event } from '@/types/allTypes';

/**
 * Typed Mutation Factory with Optimistic Updates and Rollback
 * 
 * This factory provides type-safe mutations with discriminated union types for success/error states,
 * built-in optimistic updates, and automatic rollback on failure.
 */

// Base mutation result types
export type MutationSuccess<TData> = {
  type: 'success';
  data: TData;
  timestamp: number;
  duration: number;
};

export type MutationError<TError = unknown> = {
  type: 'error';
  error: TError;
  timestamp: number;
  duration: number;
  canRetry: boolean;
  retryCount: number;
};

export type MutationLoading = {
  type: 'loading';
  timestamp: number;
};

export type MutationIdle = {
  type: 'idle';
};

// Discriminated union for mutation state
export type MutationState<TData, TError = unknown> = 
  | MutationIdle
  | MutationLoading
  | MutationSuccess<TData>
  | MutationError<TError>;

// Optimistic update configuration
export interface OptimisticUpdateConfig<TData, TVariables> {
  // Generate optimistic data from variables
  generateOptimisticData: (variables: TVariables) => TData;
  
  // Apply optimistic update to cache
  applyOptimisticUpdate: (
    queryClient: ReturnType<typeof useQueryClient>,
    optimisticData: TData,
    variables: TVariables
  ) => { queryKey: unknown[]; previousData: unknown };
  
  // Rollback optimistic update on error
  rollbackOptimisticUpdate: (
    queryClient: ReturnType<typeof useQueryClient>,
    context: { queryKey: unknown[]; previousData: unknown },
    error: unknown
  ) => void;
  
  // Apply successful mutation result
  applyMutationResult: (
    queryClient: ReturnType<typeof useQueryClient>,
    data: TData,
    variables: TVariables,
    context: { queryKey: unknown[]; previousData: unknown }
  ) => void;
}

// Mutation factory options
export interface TypedMutationOptions<TData, TVariables, TError = unknown> {
  mutationKey: string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate?: OptimisticUpdateConfig<TData, TVariables>;
  onSuccessCallback?: (data: TData, variables: TVariables) => void;
  onErrorCallback?: (error: TError, variables: TVariables) => void;
  retry?: boolean | number;
  retryDelay?: number;
  networkMode?: 'online' | 'always' | 'offlineFirst';
  meta?: Record<string, any>;
}

// Main factory function
export function createTypedMutation<TData, TVariables, TError = unknown>(
  options: TypedMutationOptions<TData, TVariables, TError>
) {
  return function useTypedMutation() {
    const queryClient = useQueryClient();
    const startTime = Date.now();

    const mutation = useMutation<TData, TError, TVariables, any>({
      mutationKey: options.mutationKey,
      mutationFn: options.mutationFn,
      
      // Optimistic update implementation
      onMutate: async (variables: TVariables) => {
        if (!options.optimisticUpdate) return;

        try {
          // Generate optimistic data
          const optimisticData = options.optimisticUpdate.generateOptimisticData(variables);
          
          // Apply optimistic update and get context for rollback
          const context = options.optimisticUpdate.applyOptimisticUpdate(
            queryClient,
            optimisticData,
            variables
          );
          
          return { ...context, optimisticData };
        } catch (error) {
          console.error('Failed to apply optimistic update:', error);
          return undefined;
        }
      },

      // Rollback on error
      onError: (error: TError, variables: TVariables, context: any) => {
        if (options.optimisticUpdate && context) {
          options.optimisticUpdate.rollbackOptimisticUpdate(
            queryClient,
            context,
            error
          );
        }
        
        // Call custom error callback
        options.onErrorCallback?.(error, variables);
      },

      // Apply successful result
      onSuccess: (data: TData, variables: TVariables, context: any) => {
        if (options.optimisticUpdate && context) {
          options.optimisticUpdate.applyMutationResult(
            queryClient,
            data,
            variables,
            context
          );
        }
        
        // Call custom success callback
        options.onSuccessCallback?.(data, variables);
      },

      // Configuration
      retry: options.retry ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      networkMode: options.networkMode ?? 'offlineFirst',
      meta: options.meta,
    });

    // Create discriminated union state
    const getMutationState = (): MutationState<TData, TError> => {
      const currentTime = Date.now();
      const duration = currentTime - startTime;

      if (mutation.isIdle) {
        return { type: 'idle' };
      }
      
      if (mutation.isPending) {
        return { 
          type: 'loading', 
          timestamp: currentTime 
        };
      }
      
      if (mutation.isError) {
        return {
          type: 'error',
          error: mutation.error,
          timestamp: currentTime,
          duration,
          canRetry: mutation.failureCount < (options.retry as number || 3),
          retryCount: mutation.failureCount,
        };
      }
      
      if (mutation.isSuccess) {
        return {
          type: 'success',
          data: mutation.data,
          timestamp: currentTime,
          duration,
        };
      }
      
      return { type: 'idle' };
    };

    return {
      // Mutation methods
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      reset: mutation.reset,
      
      // Typed state
      state: getMutationState(),
      
      // Convenience getters
      isIdle: mutation.isIdle,
      isLoading: mutation.isPending,
      isPending: mutation.isPending,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      
      // Data and error
      data: mutation.data,
      error: mutation.error,
      
      // Additional info
      failureCount: mutation.failureCount,
      failureReason: mutation.failureReason,
      status: mutation.status,
      
      // Context
      context: mutation.context,
      
      // Timestamps
      submittedAt: mutation.submittedAt,
      
      // Type guards for discriminated union
      isSuccessState: (state: MutationState<TData, TError>): state is MutationSuccess<TData> => 
        state.type === 'success',
      
      isErrorState: (state: MutationState<TData, TError>): state is MutationError<TError> => 
        state.type === 'error',
      
      isLoadingState: (state: MutationState<TData, TError>): state is MutationLoading => 
        state.type === 'loading',
      
      isIdleState: (state: MutationState<TData, TError>): state is MutationIdle => 
        state.type === 'idle',
    };
  };
}

/**
 * Pre-configured mutation factories for common patterns
 */

// Event creation mutation factory
export const createEventMutationFactory = () => {
  return createTypedMutation<Event, Partial<Event>, Error>({
    mutationKey: ['events', 'create'],
    mutationFn: async (variables) => {
      const { createEvent } = await import('@/utils/queryFunctions');
      return createEvent(variables);
    },
    optimisticUpdate: {
      generateOptimisticData: (variables) => ({
        _id: `optimistic-${Date.now()}`,
        title: variables.title || 'New Event',
        description: variables.description || '',
        start_time: variables.start_time || new Date(),
        end_time: variables.end_time || new Date(),
        location: variables.location || '',
        creator: variables.creator,
        attendees: variables.attendees || [],
        visibility: variables.visibility || 'public',
        category: variables.category || 'other',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        ...variables,
      } as Event),
      
      applyOptimisticUpdate: (queryClient, optimisticData, variables) => {
        const queryKey = ['events', 'upcoming', variables.creator?._id];
        
        // Cancel outgoing refetches
        queryClient.cancelQueries({ queryKey });
        
        // Snapshot previous data
        const previousData = queryClient.getQueryData<Event[]>(queryKey);
        
        // Apply optimistic update
        queryClient.setQueryData<Event[]>(queryKey, (oldData) => {
          if (!oldData) return [optimisticData];
          return [optimisticData, ...oldData];
        });
        
        return { queryKey, previousData };
      },
      
      rollbackOptimisticUpdate: (queryClient, context) => {
        console.error('Event creation failed, rolling back');
        queryClient.setQueryData(context.queryKey, context.previousData);
      },
      
      applyMutationResult: (queryClient, data, _variables, context) => {
        // Replace optimistic data with real data
        queryClient.setQueryData<Event[]>(context.queryKey, (oldData) => {
          if (!oldData) return [data];
          return oldData.map(event => 
            event._id?.startsWith('optimistic-') ? data : event
          );
        });
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['events'] });
      },
    },
  });
};

// Event update mutation factory
export const createEventUpdateMutationFactory = () => {
  return createTypedMutation<Event, { eventId: string; updates: Partial<Event> }, Error>({
    mutationKey: ['events', 'update'],
    mutationFn: async (variables) => {
      const { updateEvent } = await import('@/utils/queryFunctions');
      return updateEvent(variables.eventId, variables.updates);
    },
    optimisticUpdate: {
      generateOptimisticData: (variables) => variables.updates as Event,
      
      applyOptimisticUpdate: (queryClient, _optimisticData, variables) => {
        const queryKey = ['events', 'upcoming'];
        
        queryClient.cancelQueries({ queryKey });
        
        const previousData = queryClient.getQueryData<Event[]>(queryKey);
        
        queryClient.setQueryData<Event[]>(queryKey, (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(event =>
            event._id === variables.eventId
              ? { ...event, ...variables.updates, updatedAt: new Date() }
              : event
          );
        });
        
        return { queryKey, previousData };
      },
      
      rollbackOptimisticUpdate: (queryClient, context) => {
        console.error('Event update failed, rolling back');
        queryClient.setQueryData(context.queryKey, context.previousData);
      },
      
      applyMutationResult: (queryClient, data, variables, context) => {
        queryClient.setQueryData<Event[]>(context.queryKey, (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(event =>
            event._id === variables.eventId ? data : event
          );
        });
      },
    },
  });
};

// Event deletion mutation factory
export const createEventDeleteMutationFactory = () => {
  return createTypedMutation<void, string, Error>({
    mutationKey: ['events', 'delete'],
    mutationFn: async (eventId) => {
      const { deleteEvent } = await import('@/utils/queryFunctions');
      return deleteEvent(eventId);
    },
    optimisticUpdate: {
      generateOptimisticData: () => undefined as void,
      
      applyOptimisticUpdate: (queryClient, _optimisticData, eventId) => {
        const queryKey = ['events', 'upcoming'];
        
        queryClient.cancelQueries({ queryKey });
        
        const previousData = queryClient.getQueryData<Event[]>(queryKey);
        
        queryClient.setQueryData<Event[]>(queryKey, (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter(event => event._id !== eventId);
        });
        
        return { queryKey, previousData };
      },
      
      rollbackOptimisticUpdate: (queryClient, context) => {
        console.error('Event deletion failed, rolling back');
        queryClient.setQueryData(context.queryKey, context.previousData);
      },
      
      applyMutationResult: (queryClient, _data, _variables, _context) => {
        // Deletion was successful, invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['events'] });
      },
    },
  });
};

/**
 * Generic mutation factory for any entity
 */
export function createGenericMutationFactory<TData, TVariables, TError = unknown>(
  entityName: string,
  operation: 'create' | 'update' | 'delete',
  mutationFn: (variables: TVariables) => Promise<TData>,
  optimisticConfig?: OptimisticUpdateConfig<TData, TVariables>
) {
  return createTypedMutation<TData, TVariables, TError>({
    mutationKey: [entityName, operation],
    mutationFn,
    optimisticUpdate: optimisticConfig,
    networkMode: 'offlineFirst',
    retry: 3,
    retryDelay: 1000,
    meta: {
      entityName,
      operation,
      timestamp: Date.now(),
    },
  });
}

/**
 * Utility functions for working with mutation states
 */

// Extract data from success state
export function extractSuccessData<TData>(
  state: MutationState<TData, any>
): TData | null {
  return state.type === 'success' ? state.data : null;
}

// Extract error from error state
export function extractError<TError>(
  state: MutationState<any, TError>
): TError | null {
  return state.type === 'error' ? state.error : null;
}

// Check if mutation can be retried
export function canRetryMutation<TData, TError>(
  state: MutationState<TData, TError>
): boolean {
  return state.type === 'error' && state.canRetry;
}

// Get mutation duration
export function getMutationDuration<TData, TError>(
  state: MutationState<TData, TError>
): number | null {
  return state.type === 'success' || state.type === 'error' ? state.duration : null;
}

// Create a loading state indicator
export function createLoadingIndicator<TData, TError>(
  state: MutationState<TData, TError>
): { isLoading: boolean; message: string } {
  switch (state.type) {
    case 'loading':
      return { isLoading: true, message: 'Processing...' };
    case 'success':
      return { isLoading: false, message: 'Success!' };
    case 'error':
      return { isLoading: false, message: 'Error occurred' };
    default:
      return { isLoading: false, message: '' };
  }
}