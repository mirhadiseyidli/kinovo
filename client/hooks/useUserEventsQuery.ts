import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useMemo } from 'react';

/**
 * TanStack Query hooks for user profile events
 * 
 * This module provides comprehensive user events functionality with:
 * - Privacy-aware event filtering
 * - Infinite scroll pagination
 * - TanStack Query caching
 * - Support for viewing other users' events
 * - Automatic cache invalidation
 */

interface UseUserEventsQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
}

interface UserEventsResponse {
  events: Event[];
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
}

interface InfiniteUserEventsResponse {
  events: Event[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

// Privacy filter types
export type EventPrivacyLevel = 'public' | 'friends' | 'private';
export type ViewerRelationship = 'self' | 'friend' | 'stranger';

/**
 * Determines what events a viewer can see based on privacy settings and relationship
 */
const filterEventsByPrivacy = (
  events: Event[], 
  viewerRelationship: ViewerRelationship,
  viewerId: string
): Event[] => {
  return events.filter(event => {
    // User can always see their own events
    if (viewerRelationship === 'self') {
      return true;
    }

    // Handle privacy levels
    switch (event.visibility) {
      case 'public':
        return true;
      case 'friends':
        return viewerRelationship === 'friend';
      case 'private':
        return false;
      default:
        // Default to public for events without explicit visibility
        return true;
    }
  });
};

/**
 * Basic user events query (non-paginated)
 */
export const useUserEventsQuery = (
  targetUserId: string,
  options: UseUserEventsQueryOptions = {}
) => {
  const { userId: viewerId } = useAuthSession();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Determine viewer relationship
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    // TODO: Add friend relationship check from friends context/API
    // For now, assume strangers - this should be enhanced with actual friend status
    return 'stranger';
  }, [viewerId, targetUserId]);

  const query = useQuery({
    queryKey: queryKeys.specificUserEvents(viewerId || 'anonymous', targetUserId),
    queryFn: async (): Promise<Event[]> => {
      const response = await api.get(`/api/manageevents/eventslist/get/user/events?_id=${targetUserId}`);
      const allEvents = response.data.events || [];
      
      // Apply privacy filtering
      return filterEventsByPrivacy(allEvents, viewerRelationship, viewerId || '');
    },
    enabled: enabled && !!targetUserId,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus,
    
    // Performance optimizations
    structuralSharing: true,
    
    // Network mode for offline support
    networkMode: 'offlineFirst'
  });

  // Helper function to invalidate user events queries
  const invalidateUserEvents = () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.specificUserEvents(viewerId || 'anonymous', targetUserId) 
    });
  };

  return {
    ...query,
    events: query.data || [],
    loading: query.isPending,
    refreshing: query.isFetching && !query.isPending,
    invalidateUserEvents,
    viewerRelationship,
    canViewEvents: viewerRelationship !== 'stranger' || true // Allow public events for strangers
  };
};

/**
 * Infinite scroll user events query with pagination
 */
export const useUserEventsInfiniteQuery = (
  targetUserId: string,
  options: UseUserEventsQueryOptions = {}
) => {
  const { userId: viewerId } = useAuthSession();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Determine viewer relationship
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    // TODO: Add friend relationship check
    return 'stranger';
  }, [viewerId, targetUserId]);

  const infiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.infiniteUser(viewerId || 'anonymous', targetUserId, {}),
    queryFn: async ({ pageParam = 1 }): Promise<InfiniteUserEventsResponse> => {
      const response = await api.get(
        `/api/manageevents/eventslist/get/user/events?_id=${targetUserId}&page=${pageParam}&limit=10`
      );
      
      const allEvents = response.data.events || [];
      const totalCount = response.data.totalCount || allEvents.length;
      const hasMore = response.data.hasMore || false;
      
      // Apply privacy filtering
      const filteredEvents = filterEventsByPrivacy(allEvents, viewerRelationship, viewerId || '');
      
      return {
        events: filteredEvents,
        totalCount,
        hasMore,
        nextPage: hasMore ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && !!targetUserId,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus,
    
    // Performance optimizations
    structuralSharing: true,
    
    // Network mode for offline support
    networkMode: 'offlineFirst'
  });

  // Flatten events from all pages
  const allEvents = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap(page => page.events) || [];
  }, [infiniteQuery.data]);

  // Helper function to invalidate infinite user events queries
  const invalidateInfiniteUserEvents = () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.infiniteUser(viewerId || 'anonymous', targetUserId, {}) 
    });
  };

  return {
    ...infiniteQuery,
    events: allEvents,
    loading: infiniteQuery.isPending,
    refreshing: infiniteQuery.isFetching && !infiniteQuery.isPending,
    invalidateInfiniteUserEvents,
    viewerRelationship,
    canViewEvents: viewerRelationship !== 'stranger' || true,
    totalCount: infiniteQuery.data?.pages[0]?.totalCount || 0,
    hasMore: infiniteQuery.hasNextPage || false,
    loadMore: infiniteQuery.fetchNextPage,
    isLoadingMore: infiniteQuery.isFetchingNextPage
  };
};

/**
 * Hook for user's own events (convenience wrapper)
 */
export const useMyEventsQuery = (options: UseUserEventsQueryOptions = {}) => {
  const { userId } = useAuthSession();
  
  return useUserEventsQuery(userId || '', {
    ...options,
    enabled: options.enabled !== false && !!userId
  });
};

/**
 * Hook for user's own events with infinite scroll (convenience wrapper)
 */
export const useMyEventsInfiniteQuery = (options: UseUserEventsQueryOptions = {}) => {
  const { userId } = useAuthSession();
  
  return useUserEventsInfiniteQuery(userId || '', {
    ...options,
    enabled: options.enabled !== false && !!userId
  });
};

/**
 * Hook to check if viewer can see target user's events
 */
export const useCanViewUserEvents = (targetUserId: string) => {
  const { userId: viewerId } = useAuthSession();
  
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    // TODO: Add friend relationship check
    return 'stranger';
  }, [viewerId, targetUserId]);
  
  return {
    canView: viewerRelationship !== 'stranger' || true, // Allow public events
    relationship: viewerRelationship,
    isOwner: viewerRelationship === 'self',
    isFriend: viewerRelationship === 'friend',
    isStranger: viewerRelationship === 'stranger'
  };
};

/**
 * Privacy-aware event filtering utility
 */
export const useEventPrivacyFilter = () => {
  const { userId } = useAuthSession();
  
  return {
    filterEvents: (events: Event[], targetUserId: string) => {
      const viewerRelationship: ViewerRelationship = !userId 
        ? 'stranger' 
        : userId === targetUserId 
        ? 'self' 
        : 'stranger'; // TODO: Add friend check
      
      return filterEventsByPrivacy(events, viewerRelationship, userId || '');
    }
  };
};