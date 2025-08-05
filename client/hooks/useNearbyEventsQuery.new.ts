import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const useNearbyEventsQuery = (lat?: number, lng?: number, distance = 50) => {
  return useQuery({
    queryKey: queryKeys.nearbyEvents(lat!, lng!, distance),
    queryFn: () => eventApi.getNearbyEvents(lat!, lng!, distance),
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
};