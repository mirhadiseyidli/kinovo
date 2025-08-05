import { useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys.new';
import { eventApi } from '@/utils/queryFunctions.new';
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

// Response interfaces for infinite queries
interface RecommendedEventsPage {
  events: Event[];
  hasMore: boolean;
  totalCount: number;
}

interface NearbyEventsPage {
  events: Event[];
  hasMore: boolean;
  totalCount: number;
}

interface FriendsEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface AttentionRequiredEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface UpcomingEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface PastEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface UserEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

interface SearchEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage: number;
  totalCount: number;
}

// Generic infinite events page interface
interface InfiniteEventsPage {
  events: Event[];
  hasMore: boolean;
  currentPage?: number;
  totalCount: number;
}

export const useInfiniteRecommendedEvents = () => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery<RecommendedEventsPage, Error, InfiniteData<RecommendedEventsPage>, (string | undefined)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'recommended', userId || ''],
    queryFn: async ({ pageParam = 1 }) => {
      return eventApi.getRecommendedEvents(userId || '', pageParam, 10);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: RecommendedEventsPage) => {
      return lastPage.hasMore ? 2 : undefined; // Simple increment since API doesn't return currentPage
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInfiniteNearbyEvents = (lat: number, lng: number, distance: number) => {
  return useInfiniteQuery<NearbyEventsPage, Error, InfiniteData<NearbyEventsPage>, (string | { lat: number; lng: number; distance: number })[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'nearby', { lat, lng, distance }],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
        params: { lat, lng, distance, skip: pageParam, limit: 10 }
      });
      return response.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: NearbyEventsPage, pages) => {
      const totalLoaded = pages.length * 10;
      return lastPage.hasMore ? totalLoaded : undefined;
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 3 * 60 * 1000,
  });
};

export const useInfiniteFriendsEvents = (options: {
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  keepPreviousData?: boolean;
} = {}) => {
  const { userId } = useAuthSession();
  const {
    pageSize = 10,
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 10 * 60 * 1000,
    keepPreviousData = true
  } = options;
  
  return useInfiniteQuery<FriendsEventsPage, Error, InfiniteData<FriendsEventsPage>, (string | undefined)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'friends', userId || '', String(pageSize)],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/friends', {
        params: { page: pageParam, limit: pageSize }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: FriendsEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId && enabled,
    staleTime,
    gcTime,
    placeholderData: keepPreviousData ? (previousData) => previousData : undefined,
  });
};

export const useInfiniteAttentionRequiredEvents = () => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery<AttentionRequiredEventsPage, Error, InfiniteData<AttentionRequiredEventsPage>, (string | undefined)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'attention-required', userId || ''],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/attention/required', {
        params: { page: pageParam, limit: 10 }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: AttentionRequiredEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - attention required events need to be fresh
  });
};

export const useInfiniteUpcomingEvents = () => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery<UpcomingEventsPage, Error, InfiniteData<UpcomingEventsPage>, (string | undefined)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'upcoming', userId || ''],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/my/upcoming/events', {
        params: { page: pageParam, limit: 10 }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: UpcomingEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useInfinitePastEvents = (options: {
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  keepPreviousData?: boolean;
} = {}) => {
  const { userId } = useAuthSession();
  const {
    pageSize = 10,
    enabled = true,
    staleTime = 10 * 60 * 1000, // Past events change less frequently
    gcTime = 20 * 60 * 1000,
    keepPreviousData = true
  } = options;
  
  return useInfiniteQuery<PastEventsPage, Error, InfiniteData<PastEventsPage>, (string | undefined)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'past', userId || '', String(pageSize)],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/my/past/events', {
        params: { page: pageParam, limit: pageSize }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PastEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId && enabled,
    staleTime,
    gcTime,
    placeholderData: keepPreviousData ? (previousData) => previousData : undefined,
  });
};

export const useInfiniteUserEvents = (targetUserId: string) => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery<UserEventsPage, Error, InfiniteData<UserEventsPage>, (string | undefined | string)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'user', targetUserId, userId || ''],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(`/api/manageevents/eventslist/get/user/${targetUserId}`, {
        params: { page: pageParam, limit: 10 }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: UserEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId && !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInfiniteSearchEvents = (searchQuery: string, category?: string) => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery<SearchEventsPage, Error, InfiniteData<SearchEventsPage>, (string | undefined | string)[], number>({
    queryKey: [...queryKeys.all, 'infinite', 'search', searchQuery, category, userId || ''],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/search/events', {
        params: { 
          page: pageParam, 
          limit: 10, 
          q: searchQuery,
          ...(category && { category })
        }
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: SearchEventsPage) => {
      return lastPage.hasMore ? (lastPage.currentPage || 1) + 1 : undefined;
    },
    enabled: !!userId && !!searchQuery.trim(),
    staleTime: 2 * 60 * 1000,
  });
};