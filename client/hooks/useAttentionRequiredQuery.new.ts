import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';

export const useAttentionRequiredQuery = (fromHomeScreen?: boolean) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.attentionRequired(userId || '', fromHomeScreen),
    queryFn: () => eventApi.getAttentionRequired(userId || '', fromHomeScreen),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - these need to be fresh
    gcTime: 5 * 60 * 1000,
  });
};