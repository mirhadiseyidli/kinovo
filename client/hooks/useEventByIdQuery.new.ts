// New simplified useEventByIdQuery based on new_tanstack.md
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

interface UseEventByIdQueryOptions {
  enabled?: boolean;
}

export const useEventByIdQuery = (
  eventId: string,
  options: UseEventByIdQueryOptions = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.eventById(eventId),
    queryFn: () => eventApi.getEventById(eventId),
    enabled: enabled && !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });
};