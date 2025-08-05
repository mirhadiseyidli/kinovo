import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';
import api from '@/utils/api';
import { useMemo } from 'react';
import { Event } from '@/types/allTypes';

// Types for cleaner code
interface UserEventPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

export const useUserEventsQuery = (profileUserId: string) => {
  const { userId: viewerId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.userPublicEvents(viewerId || '', profileUserId),
    queryFn: () => eventApi.getUserEvents(viewerId || '', profileUserId),
    enabled: !!viewerId && !!profileUserId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

export const useUserEventCountQuery = (profileUserId: string) => {
  const { userId: viewerId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.userEventCount(viewerId || '', profileUserId),
    queryFn: () => eventApi.getUserEventCount(viewerId || '', profileUserId),
    enabled: !!viewerId && !!profileUserId,
    staleTime: 10 * 60 * 1000, // Count changes less frequently
    gcTime: 30 * 60 * 1000,
  });
};

// Simple infinite scroll hook - matches your existing interface exactly
export const useUserEventsInfiniteQuery = (profileUserId: string, options: {
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
} = {}) => {
  const { userId: viewerId } = useAuthSession();
  
  const query = useInfiniteQuery<UserEventPage>({
    queryKey: [...queryKeys.userPublicEvents(viewerId || '', profileUserId), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/user/events', {
        params: { 
          _id: profileUserId,
          page: pageParam,
          limit: 10
        }
      });
      console.log('*********', response.data.events)
      return {
        events: response.data.events || [],
        hasMore: response.data.hasMore || false,
        currentPage: pageParam as number,
        totalCount: response.data.totalCount || 0,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    enabled: !!viewerId && !!profileUserId,
    staleTime: options.staleTime || 5 * 60 * 1000,
    refetchOnMount: options.refetchOnMount !== false,
    refetchOnWindowFocus: options.refetchOnWindowFocus !== false,
  });

  // Simple data transformation - flatten pages into events array
  const events = useMemo(() => {
    return query.data?.pages.flatMap(page => page.events) || [];
  }, [query.data]);

  // Return interface that matches your existing hook exactly
  return {
    events,
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    isLoadingMore: query.isFetchingNextPage,
    refetch: query.refetch,
    error: query.error,
  };
};

// Simple permission check - with safe defaults
export const useCanViewUserEvents = (profileUserId: string) => {
  const { userId: viewerId } = useAuthSession();
  
  const query = useQuery({
    queryKey: ['userPermissions', viewerId, profileUserId],
    queryFn: async () => {
      // If viewing own profile, always allow
      if (viewerId === profileUserId) {
        return { canView: true, relationship: 'self' };
      }
      
      const response = await api.get('/api/users/can-view-events', {
        params: { userId: profileUserId }
      });
      return response.data;
    },
    enabled: !!viewerId && !!profileUserId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    canView: query.data?.canView ?? true, // Safe default - show events unless explicitly blocked
    relationship: query.data?.relationship || 'none',
    isOwner: viewerId === profileUserId,
    loading: query.isLoading,
    error: query.error,
  };
};