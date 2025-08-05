import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys.new';
import { userQueryKeys } from './useUserQueries.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const useQueryUtils = () => {
  const queryClient = useQueryClient();

  // Prefetch commonly needed data
  const prefetchEventDetails = (eventId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventById(eventId),
      queryFn: () => eventApi.getEventById(eventId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Clear all caches (for logout)
  const clearAllCaches = () => {
    queryClient.clear();
  };

  // Invalidate user-related data (for profile updates)
  const invalidateUserData = () => {
    queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
  };

  // Invalidate event-related data (for event changes)
  const invalidateEventData = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
  };

  return {
    prefetchEventDetails,
    clearAllCaches,
    invalidateUserData,
    invalidateEventData,
  };
};