import { useQuery, useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';
import { useMemo } from 'react';
import { useUserData } from '@/hooks/useUserData';

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
  console.log('viewer relationship', viewerRelationship)
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
        // Private events are visible if the viewer is in the attendee list
        return event.attendees?.some(attendee => attendee.user._id === viewerId) || false;
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
  const { user: currentUser } = useUserData();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Determine viewer relationship with proper friend checking
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    
    // Check if users are friends (bidirectional check)
    const areFriends = currentUser?.friends?.includes(targetUserId) || false;
    return areFriends ? 'friend' : 'stranger';
  }, [viewerId, targetUserId, currentUser?.friends]);

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
  const { user: currentUser } = useUserData();
  const queryClient = useQueryClient();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = false,
    refetchOnWindowFocus = false
  } = options;

  // Determine viewer relationship with proper friend checking
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    
    // Check if users are friends (bidirectional check)
    const areFriends = currentUser?.friends?.includes(targetUserId) || false;
    return areFriends ? 'friend' : 'stranger';
  }, [viewerId, targetUserId, currentUser?.friends]);

  const infiniteQuery = useInfiniteQuery<
    InfiniteUserEventsResponse,
    Error,
    InfiniteData<InfiniteUserEventsResponse>,
    readonly unknown[],
    number
  >({
    queryKey: queryKeys.infiniteUser(viewerId || 'anonymous', targetUserId, {}),
    queryFn: async ({ pageParam }): Promise<InfiniteUserEventsResponse> => {
      const response = await api.get(
        `/api/manageevents/eventslist/get/user/events?_id=${targetUserId}&page=${pageParam}&limit=10`
      );
      
      const data = response.data as {
        events?: Event[];
        totalCount?: number;
        hasMore?: boolean;
      };
      
      const allEvents = data.events || [];
      const totalCount = data.totalCount || allEvents.length;
      const hasMore = data.hasMore || false;
      
      // Apply privacy filtering
      const filteredEvents = filterEventsByPrivacy(allEvents, viewerRelationship, viewerId || '');
      console.log('this', filteredEvents)
      
      return {
        events: filteredEvents,
        totalCount,
        hasMore,
        nextPage: hasMore ? pageParam + 1 : undefined
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: enabled && !!targetUserId,
    staleTime,
    refetchOnMount,
    refetchOnWindowFocus,
    
    // Performance optimizations
    structuralSharing: true,
    
    // Network mode for offline support
    networkMode: 'offlineFirst' as const
  });

  // Flatten events from all pages
  const allEvents = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap((page) => page.events) || [];
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
    totalCount: infiniteQuery.data?.pages?.[0]?.totalCount || 0,
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
  const { user: currentUser } = useUserData();
  
  const viewerRelationship: ViewerRelationship = useMemo(() => {
    if (!viewerId) return 'stranger';
    if (viewerId === targetUserId) return 'self';
    
    // Check if users are friends (bidirectional check)
    const areFriends = currentUser?.friends?.includes(targetUserId) || false;
    return areFriends ? 'friend' : 'stranger';
  }, [viewerId, targetUserId, currentUser?.friends]);
  
  return {
    canView: viewerRelationship !== 'stranger' || true, // Allow public events
    relationship: viewerRelationship,
    isOwner: viewerRelationship === 'self',
    isFriend: (viewerRelationship as string) === 'friend',
    isStranger: viewerRelationship === 'stranger'
  };
};

/**
 * Privacy-aware event filtering utility
 */
export const useEventPrivacyFilter = () => {
  const { userId } = useAuthSession();
  const { user: currentUser } = useUserData();
  
  return {
    filterEvents: (events: Event[], targetUserId: string) => {
      let viewerRelationship: ViewerRelationship = 'stranger';
      
      if (!userId) {
        viewerRelationship = 'stranger';
      } else if (userId === targetUserId) {
        viewerRelationship = 'self';
      } else {
        // Check if users are friends
        const areFriends = currentUser?.friends?.includes(targetUserId) || false;
        viewerRelationship = areFriends ? 'friend' : 'stranger';
      }
      
      return filterEventsByPrivacy(events, viewerRelationship, userId || '');
    }
  };
};