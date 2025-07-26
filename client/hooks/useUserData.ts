import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import api from '@/utils/api';
import { User } from '@/types/allTypes';

interface UseUserDataResult {
  user: User | null;
  loading: boolean;
  isInitialLoading: boolean;
  isRefetching: boolean;
  error: any;
  isError: boolean;
  refetch: () => Promise<any>;
  invalidateUser: () => void;
}

export const useUserData = (): UseUserDataResult => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  // Create the query key
  const queryKey = ['user', 'me', userId];

  const userQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get('/api/users/me');
      return response.data as User;
    },
    enabled: !!userId, // Only fetch when we have a userId
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when reconnecting to network
  });

  return {
    user: userQuery.data || null,
    loading: userQuery.isLoading || userQuery.isFetching,
    isInitialLoading: userQuery.isLoading,
    isRefetching: userQuery.isRefetching,
    error: userQuery.error,
    isError: userQuery.isError,
    refetch: userQuery.refetch,
    invalidateUser: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
};

// Legacy support - export the same hook with the old function-based approach
export const useUserDataLegacy = () => {
  const { user, loading, isInitialLoading, refetch } = useUserData();
  
  // Create a wrapper that returns the user data directly like the old implementation
  const fetchUserData = async () => {
    const result = await refetch();
    return result.data || null;
  };
  
  return {
    fetchUserData,
    refetchUser: fetchUserData, // Both should return the data
    isFirstFetch: isInitialLoading,
    loading,
    // Include user data for components that might need it
    user,
  };
};