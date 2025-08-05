import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { queryKeys } from '@/utils/queryKeys.new';
import { Event } from '@/types/allTypes';

interface PageData {
  events: Event[];
  totalCount?: number;
  hasMore?: boolean;
  currentPage?: number;
  totalPages?: number;
}

interface InfiniteQueryData {
  pages: PageData[];
  pageParams: unknown[];
}

interface CreateEventData {
  title: string;
  description: string;
  start_time: string | Date;
  end_time: string | Date;
  location: {
    text: string | null;
    coordinates: { lat: number | null; lng: number | null; };
  };
  category: string;
  visibility: 'public' | 'private';
  maxParticipants?: number;
  isRecurring?: boolean;
  recurringPattern?: any;
}

export const useEventCrud = () => {
  const queryClient = useQueryClient();

  /**
   * Helper function to update an event in ALL caches where it appears
   * This ensures UI consistency across all screens without refetching
   */
  const updateEventInAllCaches = (updatedEvent: Event) => {
    // 1. Update the individual event detail cache
    queryClient.setQueryData(
      queryKeys.eventById(updatedEvent._id), 
      updatedEvent
    );
    
    // 2. Update this event in ALL list caches using setQueriesData
    queryClient.setQueriesData(
      { queryKey: ['events'], exact: false },
      (oldData: Event[] | InfiniteQueryData | undefined) => {
        if (!oldData) return oldData;
        
        // Handle array of events (most list queries)
        if (Array.isArray(oldData)) {
          return oldData.map((event: Event) => 
            event._id === updatedEvent._id ? updatedEvent : event
          );
        }
        
        // Handle paginated/infinite query data structure
        if ('pages' in oldData) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: PageData) => ({
              ...page,
              events: page.events?.map((event: Event) => 
                event._id === updatedEvent._id ? updatedEvent : event
              ) || []
            }))
          };
        }
        
        return oldData;
      }
    );
  };

  /**
   * Helper function to remove an event from all caches
   */
  const removeEventFromAllCaches = (eventId: string) => {
    // Remove from all list caches
    queryClient.setQueriesData(
      { queryKey: ['events'], exact: false },
      (oldData: Event[] | InfiniteQueryData | undefined) => {
        if (!oldData) return oldData;
        
        // Handle array of events
        if (Array.isArray(oldData)) {
          return oldData.filter((event: Event) => event._id !== eventId);
        }
        
        // Handle paginated data
        if ('pages' in oldData) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: PageData) => ({
              ...page,
              events: page.events?.filter((event: Event) => event._id !== eventId) || [],
              // Update count if available
              totalCount: page.totalCount ? page.totalCount - 1 : page.totalCount
            }))
          };
        }
        
        return oldData;
      }
    );
    
    // Remove the detail cache entry
    queryClient.removeQueries({ queryKey: queryKeys.eventById(eventId) });
  };

  const createEvent = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const response = await api.post('/api/manageevents/create', eventData);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.event) {
        // Add to detail cache immediately
        queryClient.setQueryData(
          queryKeys.eventById(data.event._id), 
          data.event
        );
        
        // For new events, we need to invalidate lists to show the new event
        // But we skip detail queries to avoid refetching what we just cached
        queryClient.invalidateQueries({ 
          queryKey: ['events'],
          exact: false,
          predicate: (query) => !query.queryKey.includes('detail')
        });
      }
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ eventId, updates, occurrenceDate, modifyType }: {
      eventId: string;
      updates: Partial<Event>;
      occurrenceDate?: Date;
      modifyType?: 'this_only' | 'all_instances';
    }) => {
      const response = await api.put(`/api/manageevents/update/${eventId}`, {
        ...updates,
        occurrence_date: occurrenceDate,
        modify_type: modifyType
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Direct cache update - no invalidation needed
      if (data?.event) {
        updateEventInAllCaches(data.event);
      }
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.delete(`/api/manageevents/delete/${eventId}`);
      return response.data;
    },
    onSuccess: (_, eventId) => {
      // Remove from all caches - no invalidation needed
      removeEventFromAllCaches(eventId);
    },
  });

  const respondToInvitation = useMutation({
    mutationFn: async ({ eventId, status, occurrenceDate, modifyType }: {
      eventId: string;
      status: 'accepted' | 'maybe' | 'rejected';
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/respond/invitation', {
        eventId, status, occurrenceDate, modifyType
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Direct cache update - UI updates instantly everywhere
      if (data?.event) {
        updateEventInAllCaches(data.event);
      }
    },
  });

  const joinEvent = useMutation({
    mutationFn: async ({ eventId, status }: {
      eventId: string;
      status: 'accepted' | 'maybe';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/join', { eventId, status });
      return response.data;
    },
    onSuccess: (data) => {
      // Direct cache update - no invalidation needed
      if (data?.event) {
        updateEventInAllCaches(data.event);
      }
    },
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    respondToInvitation,
    joinEvent,
    // Combined loading states for UI
    isLoading: createEvent.isPending || updateEvent.isPending || deleteEvent.isPending ||
               respondToInvitation.isPending || joinEvent.isPending,
    error: createEvent.error || updateEvent.error || deleteEvent.error ||
           respondToInvitation.error || joinEvent.error,
  };
};