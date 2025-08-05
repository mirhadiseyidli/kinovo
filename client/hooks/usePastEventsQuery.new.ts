import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const usePastEventsQuery = (page = 1, limit = 5, year?: number, month?: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.pastEvents(userId || '', { page, limit, year, month }),
    queryFn: () => eventApi.getPastEvents(userId || '', page, limit, year, month),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Past events change less frequently
    gcTime: 15 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep previous pages when fetching new ones
  });
};

export const useInfinitePastEventsQuery = (year?: number, month?: number) => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery({
    queryKey: [...queryKeys.pastEvents(userId || '', { year, month }), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      return eventApi.getPastEvents(userId || '', pageParam as number, 10, year, month);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};