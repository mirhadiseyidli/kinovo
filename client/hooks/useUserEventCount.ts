import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';

/**
 * Hook to get the count of visible events for a user
 * Uses the same backend filtering logic as UserEvents.v2 for consistency
 */
export const useUserEventCount = (targetUserId: string) => {
  const { userId: viewerId } = useAuthSession();

  const query = useQuery({
    queryKey: queryKeys.userEventCount(viewerId || 'anonymous', targetUserId),
    queryFn: async (): Promise<number> => {
      const response = await api.get(`/api/manageevents/eventslist/get/user/events/count?_id=${targetUserId}`);
      return response.data.count || 0;
    },
    enabled: !!targetUserId && !!viewerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  return {
    ...query,
    count: query.data || 0,
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending
  };
};