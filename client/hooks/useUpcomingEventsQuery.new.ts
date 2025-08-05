import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const useUpcomingEventsQuery = (fromHomeScreen?: boolean) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.upcomingEvents(userId || '', fromHomeScreen),
    queryFn: () => eventApi.getUpcomingEvents(userId || '', fromHomeScreen),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for lists
    gcTime: 10 * 60 * 1000,
  });
};