# New TanStack Query Implementation Guide

## Overview

This document outlines the complete TanStack Query implementation for Kinovo's event management system. Based on the backend's consistent response structure, this guide provides patterns for creating a perfect, bottleneck-free TanStack Query setup with seamless cache management.

## Backend Response Structure Analysis

The backend has been refactored to provide two consistent response types:

### Type 1: Event Data Response
```typescript
{
  success: boolean;
  message: string;
  event: Event; // Full event object with user relationships
  metadata?: any; // Optional pagination, counts, etc.
}
```

### Type 2: Success Only Response  
```typescript
{
  success: boolean;
  message: string;
  metadata?: any; // Optional additional data
}
```

**Key Backend Features:**
- All event APIs return standardized responses using `buildEnrichedEventResponse()` and `buildSuccessResponse()`
- Events include user context (attendance status, relationships)
- Consistent population of creator, attendees with full user data
- Recurring event handling with proper occurrence management
- Real-time cache invalidation support

## Core Architecture Principles

### 1. Query Key Strategy

```typescript
// /utils/queryKeys.ts
export const queryKeys = {
  // Base key for all event queries
  all: ['events'] as const,
  
  // Individual event queries
  eventById: (eventId: string) => [...queryKeys.all, 'detail', eventId] as const,
  
  // User-specific event lists
  myEvents: (userId: string) => [...queryKeys.all, 'user', userId] as const,
  upcomingEvents: (userId: string, homeScreen?: boolean) => 
    [...queryKeys.myEvents(userId), 'upcoming', { homeScreen: homeScreen || false }] as const,
  pastEvents: (userId: string, filters?: { year?: number; month?: number }) => 
    [...queryKeys.myEvents(userId), 'past', filters || {}] as const,
  attentionRequired: (userId: string, homeScreen?: boolean) => 
    [...queryKeys.myEvents(userId), 'attention', { homeScreen: homeScreen || false }] as const,
  
  // Discovery queries
  nearbyEvents: (lat: number, lng: number, distance: number) => 
    [...queryKeys.all, 'nearby', { lat, lng, distance }] as const,
  recommendedEvents: (userId: string) => 
    [...queryKeys.all, 'recommended', userId] as const,
  friendsEvents: (userId: string) => 
    [...queryKeys.all, 'friends', userId] as const,
  
  // Calendar queries
  calendarEvents: (userId: string, month: number, year: number) => 
    [...queryKeys.myEvents(userId), 'calendar', { month, year }] as const,
  calendarRange: (userId: string, startDate: string, endDate: string) => 
    [...queryKeys.myEvents(userId), 'range', { startDate, endDate }] as const,
  
  // Search queries
  searchEvents: (query: string) => 
    [...queryKeys.all, 'search', query] as const,
  
  // Infinite queries
  infiniteEvents: (type: string, params: Record<string, any>) => 
    [...queryKeys.all, 'infinite', type, params] as const,
  
  // Profile queries
  userPublicEvents: (viewerId: string, profileUserId: string) => 
    [...queryKeys.all, 'profile', viewerId, profileUserId] as const,
  userEventCount: (viewerId: string, profileUserId: string) => 
    [...queryKeys.all, 'count', viewerId, profileUserId] as const,
};
```

### 2. API Functions

```typescript
// /utils/queryFunctions.ts
import api from '@/utils/api';
import { Event } from '@/types/allTypes';

// Base API functions - TanStack Query handles error management
export const eventApi = {
  // Get individual event
  getEventById: async (eventId: string): Promise<Event> => {
    const response = await api.get(`/api/manageevents/eventslist/event/get/event/by/id?_id=${eventId}`);
    return response.data.event;
  },
  
  // User events
  getMyEvents: async (userId: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/my/events');
    return response.data.events || [];
  },
  
  getUpcomingEvents: async (userId: string, fromHomeScreen?: boolean): Promise<Event[]> => {
    const params = fromHomeScreen ? '?from_home_screen=true' : '';
    const response = await api.get(`/api/manageevents/eventslist/get/my/upcoming/events${params}`);
    return response.data.events || [];
  },
  
  getPastEvents: async (userId: string, page = 1, limit = 5, year?: number, month?: number): Promise<{ events: Event[]; hasMore: boolean; totalCount: number; currentPage: number; totalPages: number }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (year !== undefined) params.append('year', year.toString());
    if (month !== undefined) params.append('month', month.toString());
    
    const response = await api.get(`/api/manageevents/eventslist/get/my/past/events?${params}`);
    return {
      events: response.data.events || [],
      hasMore: response.data.hasMore || false,
      totalCount: response.data.totalCount || 0,
      currentPage: response.data.currentPage || page,
      totalPages: response.data.totalPages || 0,
    };
  },
  
  getAttentionRequired: async (userId: string, fromHomeScreen?: boolean): Promise<Event[]> => {
    const params = fromHomeScreen ? '?from_home_screen=true' : '';
    const response = await api.get(`/api/manageevents/eventslist/get/attention/required${params}`);
    return response.data.events || [];
  },
  
  // Discovery
  getNearbyEvents: async (lat: number, lng: number, distance: number): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
      params: { lat, lng, distance }
    });
    return response.data.events || [];
  },
  
  getRecommendedEvents: async (userId: string, page = 1, limit = 5): Promise<{ events: Event[]; hasMore: boolean; totalCount: number }> => {
    const response = await api.get('/api/manageevents/eventslist/get/recommended', {
      params: { page, limit }
    });
    return {
      events: response.data.events || [],
      hasMore: response.data.hasMore || false,
      totalCount: response.data.totalCount || 0
    };
  },
  
  getFriendsEvents: async (userId: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/friends');
    return response.data.events || [];
  },
  
  // Calendar
  getCalendarEvents: async (userId: string, month: number, year: number): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/my/events/month/view', {
      params: { month, year }
    });
    return response.data.events || [];
  },
  
  getCalendarRange: async (userId: string, startDate: string, endDate: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/my/events/range', {
      params: { start: startDate, end: endDate }
    });
    return response.data.events || [];
  },
  
  // Profile
  getUserEvents: async (viewerId: string, profileUserId: string): Promise<Event[]> => {
    const response = await api.get('/api/manageevents/eventslist/get/user/events', {
      params: { _id: profileUserId }
    });
    return response.data.events || [];
  },
  
  getUserEventCount: async (viewerId: string, profileUserId: string): Promise<number> => {
    const response = await api.get('/api/manageevents/eventslist/get/user/events/count', {
      params: { _id: profileUserId }
    });
    return response.data.count || 0;
  },
};
```

## Query Hooks Implementation

### 1. Individual Event Hook

```typescript
// /hooks/useEventByIdQuery.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys';
import { eventApi } from '@/utils/queryFunctions';

export const useEventByIdQuery = (eventId: string, options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: queryKeys.eventById(eventId),
    queryFn: () => eventApi.getEventById(eventId),
    enabled: options.enabled !== false && !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes - events don't change frequently
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    }
  });
};
```

### 2. Event List Hooks

```typescript
// /hooks/useEventListQueries.ts
import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { eventApi } from '@/utils/queryFunctions';

export const useUpcomingEventsQuery = (fromHomeScreen?: boolean) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.upcomingEvents(userId, fromHomeScreen),
    queryFn: () => eventApi.getUpcomingEvents(userId, fromHomeScreen),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes for lists
    gcTime: 10 * 60 * 1000,
  });
};

export const usePastEventsQuery = (page = 1, limit = 5, year?: number, month?: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.pastEvents(userId, { page, limit, year, month }),
    queryFn: () => eventApi.getPastEvents(userId, page, limit, year, month),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Past events change less frequently
    gcTime: 15 * 60 * 1000,
    keepPreviousData: true, // Keep previous pages when fetching new ones
  });
};

export const useInfinitePastEventsQuery = (year?: number, month?: number) => {
  const { userId } = useAuthSession();
  
  return useInfiniteQuery({
    queryKey: [...queryKeys.pastEvents(userId, { year, month }), 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      return eventApi.getPastEvents(userId, pageParam, 10, year, month);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useAttentionRequiredQuery = (fromHomeScreen?: boolean) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.attentionRequired(userId, fromHomeScreen),
    queryFn: () => eventApi.getAttentionRequired(userId, fromHomeScreen),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute - these need to be fresh
    gcTime: 5 * 60 * 1000,
  });
};

export const useNearbyEventsQuery = (lat?: number, lng?: number, distance = 50) => {
  return useQuery({
    queryKey: queryKeys.nearbyEvents(lat!, lng!, distance),
    queryFn: () => eventApi.getNearbyEvents(lat!, lng!, distance),
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });
};

export const useCalendarEventsQuery = (month: number, year: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: queryKeys.calendarEvents(userId, month, year),
    queryFn: () => eventApi.getCalendarEvents(userId, month, year),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000, // Keep calendar data longer
  });
};
```

## Mutation Implementation

### 1. Core Event CRUD Operations

```typescript
// /hooks/useEventMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import api from '@/utils/api';
import { Alert } from 'react-native';

// Event response mutation
export const useEventResponseMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe' | 'rejected';
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/respond/invitation', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate all user event lists for background refresh
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.myEvents(userId),
          exact: false 
        });
      } else if (data.success) {
        // Success but no event data - remove from cache (like cancel)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.myEvents(userId),
          exact: false 
        });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to respond to invitation';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Join event mutation
export const useJoinEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      status: 'accepted' | 'maybe';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/join', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual event cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // Invalidate user events and discovery queries
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nearby'], exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId) });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to join event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Cancel event mutation
export const useCancelEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }) => {
      const response = await api.post('/api/manageevents/eventslist/cancel/event', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success) {
        // Remove from individual cache (cancelled events shouldn't show)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        // Invalidate all relevant lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to cancel event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Mark not interested mutation
export const useMarkNotInterestedMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { eventId: string }) => {
      const response = await api.post('/api/manageevents/eventslist/not-interested', variables);
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success) {
        // Remove from cache (not interested events shouldn't show)
        queryClient.removeQueries({ queryKey: queryKeys.eventById(variables.eventId) });
        
        // Invalidate discovery queries to remove from lists
        queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nearby'], exact: false });
        queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.friendsEvents(userId) });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to mark as not interested';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Create event mutation
export const useCreateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: any) => {
      const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
      return response.data;
    },
    
    onSuccess: (data) => {
      if (data.success && data.event) {
        // Add to individual cache
        queryClient.setQueryData(queryKeys.eventById(data.event._id), data.event);
        
        // Invalidate user event lists to show new event
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};

// Update event mutation
export const useUpdateEventMutation = () => {
  const { userId } = useAuthSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      updates: any;
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future' | 'all_instances';
    }) => {
      const response = await api.put(`/api/manageevents/eventslist/update/${variables.eventId}`, {
        ...variables.updates,
        occurrenceDate: variables.occurrenceDate,
        modifyType: variables.modifyType
      });
      return response.data;
    },
    
    onSuccess: (data, variables) => {
      if (data.success && data.event) {
        // Update individual cache
        queryClient.setQueryData(queryKeys.eventById(variables.eventId), data.event);
        
        // If eventId changed (recurring event split), handle both
        if (data.updatedEventId && data.updatedEventId !== variables.eventId) {
          queryClient.setQueryData(queryKeys.eventById(data.updatedEventId), data.event);
        }
        
        // Invalidate user event lists
        queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
      }
    },
    
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update event';
      Alert.alert('Error', message);
    },
    
    retry: 2,
    networkMode: 'offlineFirst',
  });
};
```

## Cache Management Strategy

### 1. Cache Update Patterns

**For Event Data Responses:**
1. Update individual event cache immediately
2. Invalidate relevant list queries for background refresh
3. Don't over-invalidate - be specific with query keys

**For Success Only Responses:**
1. Remove from individual cache if event is deleted/cancelled
2. Invalidate list queries to reflect changes
3. Update related counts if necessary

### 2. Cache Invalidation Hierarchy

```typescript
// /utils/cacheInvalidation.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export const cacheInvalidation = {
  // Invalidate all user-specific event queries
  userEvents: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.myEvents(userId), 
      exact: false 
    });
  },
  
  // Invalidate discovery queries
  discoveryEvents: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.friendsEvents(userId) });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nearby'], exact: false });
  },
  
  // Invalidate calendar queries
  calendarEvents: (queryClient: QueryClient, userId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.myEvents(userId), 'calendar'], 
      exact: false 
    });
    queryClient.invalidateQueries({ 
      queryKey: [...queryKeys.myEvents(userId), 'range'], 
      exact: false 
    });
  },
  
  // Nuclear option - invalidate everything (use sparingly)
  allEvents: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.all, exact: false });
  }
};
```

## Optimistic Updates (Advanced)

For instant UI feedback, implement optimistic updates for key mutations:

```typescript
// /utils/optimisticUpdates.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { Event } from '@/types/allTypes';

export const optimisticUpdates = {
  // Optimistic response to invitation
  respondToInvitation: (
    queryClient: QueryClient, 
    eventId: string, 
    userId: string, 
    status: 'accepted' | 'maybe' | 'rejected'
  ) => {
    const queryKey = queryKeys.eventById(eventId);
    const previousEvent = queryClient.getQueryData<Event>(queryKey);
    
    if (previousEvent) {
      const updatedEvent = {
        ...previousEvent,
        userStatus: status,
        isUserAttending: status === 'accepted' || status === 'maybe',
        attendees: previousEvent.attendees?.map(attendee => 
          attendee.user._id === userId 
            ? { ...attendee, status }
            : attendee
        ) || []
      };
      
      queryClient.setQueryData(queryKey, updatedEvent);
    }
    
    return previousEvent;
  },
  
  // Rollback optimistic update on error
  rollback: (queryClient: QueryClient, eventId: string, previousData: Event | undefined) => {
    if (previousData) {
      queryClient.setQueryData(queryKeys.eventById(eventId), previousData);
    }
  }
};
```

## Performance Optimization

### 1. Prefetching Strategy

```typescript
// /utils/prefetching.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { eventApi } from './queryFunctions';

export const prefetching = {
  // Prefetch event details when hovering/touching event cards
  prefetchEventDetails: (queryClient: QueryClient, eventId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventById(eventId),
      queryFn: () => eventApi.getEventById(eventId),
      staleTime: 5 * 60 * 1000,
    });
  },
  
  // Prefetch next page of calendar events
  prefetchCalendarMonth: (queryClient: QueryClient, userId: string, month: number, year: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendarEvents(userId, month, year),
      queryFn: () => eventApi.getCalendarEvents(userId, month, year),
      staleTime: 5 * 60 * 1000,
    });
  }
};
```

### 2. Background Sync

```typescript
// /hooks/useBackgroundSync.ts
import { useQuery } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { queryKeys } from '@/utils/queryKeys';
import { eventApi } from '@/utils/queryFunctions';

// Background sync for critical data
export const useBackgroundSync = () => {
  const { userId } = useAuthSession();
  
  // Sync attention required events more frequently
  useQuery({
    queryKey: queryKeys.attentionRequired(userId, false),
    queryFn: () => eventApi.getAttentionRequired(userId, false),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 2 * 60 * 1000, // Every 2 minutes
    refetchIntervalInBackground: true,
  });
};
```

## Error Handling

### 1. Global Error Handling

```typescript
// /utils/errorHandling.ts
import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const setupGlobalErrorHandling = (queryClient: QueryClient) => {
  queryClient.setDefaultOptions({
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401) return false;
        // Don't retry on not found
        if (error?.response?.status === 404) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      onError: (error: any) => {
        const message = error.response?.data?.message || error.message || 'An error occurred';
        if (error?.response?.status !== 401) { // Don't show alerts for auth errors
          Alert.alert('Error', message);
        }
      }
    }
  });
};
```

## Migration Guide

### 1. From Existing Hooks

Replace existing event hooks gradually:

```typescript
// Before
const { events, loading, error, refetch } = useGetUpcomingEvents();

// After  
const { data: events, isLoading: loading, error, refetch } = useUpcomingEventsQuery();
```

### 2. From Event Context

Replace centralized event context with distributed query approach:

```typescript
// Before
const { events, updateEvent } = useEventContext();

// After
const { data: events } = useUpcomingEventsQuery();
const { mutate: updateEvent } = useUpdateEventMutation();
```

## Best Practices

### 1. Query Key Consistency
- Always use the queryKeys factory
- Never create ad-hoc query keys
- Include all relevant parameters in keys

### 2. Cache Management
- Update individual caches immediately with server responses
- Use targeted invalidation, not nuclear invalidation
- Implement optimistic updates for instant feedback

### 3. Error Handling
- Let TanStack Query handle retries
- Show user-friendly error messages
- Don't retry on permanent errors (401, 404)

### 4. Performance
- Use appropriate stale times based on data frequency
- Implement prefetching for predictable navigation
- Use background sync for critical data only

### 5. Type Safety
- Define proper TypeScript interfaces
- Use typed query keys
- Implement proper error types

## Complete Hook Ecosystem

Beyond events, you'll need these additional hooks for a full TanStack Query implementation:

### 1. User Management Hooks

```typescript
// /hooks/useUserQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import api from '@/utils/api';

export const userQueryKeys = {
  all: ['users'] as const,
  currentUser: () => [...userQueryKeys.all, 'current'] as const,
  userProfile: (userId: string) => [...userQueryKeys.all, 'profile', userId] as const,
  friends: () => [...userQueryKeys.all, 'friends'] as const,
  favoriteActivities: () => [...userQueryKeys.all, 'activities'] as const,
};

// Current user data
export const useUserData = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: userQueryKeys.currentUser(),
    queryFn: async () => {
      const response = await api.get('/api/users/me');
      return response.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Friends data
export const useGetMyFriends = () => {
  return useQuery({
    queryKey: userQueryKeys.friends(),
    queryFn: async () => {
      const response = await api.get('/api/friends');
      return response.data.friends || [];
    },
    staleTime: 10 * 60 * 1000,
  });
};

// Favorite activities mutation
export const useFavoriteActivities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activities: string[]) => {
      const response = await api.put('/api/users/favorite-activities', { activities });
      return response.data;
    },
    onSuccess: (data) => {
      // Update user cache
      queryClient.setQueryData(userQueryKeys.currentUser(), (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          favorite_activities: data.favorite_activities
        };
      });
      
      // Invalidate events that depend on activities (recommended)
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendedEvents(userId) });
    },
  });
};
```

### 2. Notifications Hooks

```typescript
// /hooks/useNotificationQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
  friendRequests: () => [...notificationQueryKeys.all, 'friend-requests'] as const,
};

export const useNotificationData = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: async () => {
      const response = await api.get('/api/notifications');
      return response.data.notifications || [];
    },
    staleTime: 1 * 60 * 1000, // Fresh notifications needed quickly
    refetchInterval: 2 * 60 * 1000, // Background sync every 2 minutes
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put(`/api/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const response = await api.put('/api/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list() });
    },
  });

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    unreadCount: (notificationsQuery.data || []).filter(n => !n.is_seen).length,
  };
};

export const usePaginatedNotifications = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: [...notificationQueryKeys.list(), 'paginated', { page, limit }],
    queryFn: async () => {
      const response = await api.get('/api/notifications/paginated', {
        params: { page, limit }
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true, // Keep previous pages when fetching new ones
  });
};
```

### 3. Search Hooks

```typescript
// /hooks/useSearchQueries.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';

export const searchQueryKeys = {
  all: ['search'] as const,
  everything: (query: string) => [...searchQueryKeys.all, 'everything', query] as const,
  events: (query: string) => [...searchQueryKeys.all, 'events', query] as const,
  users: (query: string) => [...searchQueryKeys.all, 'users', query] as const,
};

export const useSearchEverythingDiscovery = (query: string, enabled = true) => {
  return useQuery({
    queryKey: searchQueryKeys.everything(query),
    queryFn: async () => {
      if (!query || query.length < 2) {
        return { events: [], users: [] };
      }
      
      const response = await api.get('/api/search/everything', {
        params: { q: query }
      });
      
      return {
        events: response.data.events || [],
        users: response.data.users || []
      };
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // Search results can be stale for 30 seconds
  });
};

export const useEventSearch = (query: string) => {
  return useQuery({
    queryKey: searchQueryKeys.events(query),
    queryFn: async () => {
      const response = await api.get('/api/search/events', {
        params: { q: query }
      });
      return response.data.events || [];
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
};
```

### 4. Friend Management Hooks

```typescript
// /hooks/useFriendMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { userQueryKeys } from './useUserQueries';

export const useFriendMutations = () => {
  const queryClient = useQueryClient();

  const sendFriendRequest = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post('/api/friends/request', { userId });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate friends and friend requests
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.friendRequests() });
    },
  });

  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.post(`/api/friends/accept/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.friendRequests() });
      // Invalidate friends events since friend list changed
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsEvents(userId) });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (friendId: string) => {
      const response = await api.delete(`/api/friends/${friendId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.friends() });
    },
  });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
  };
};
```

### 5. Infinite Query Hooks

```typescript
// /hooks/useInfiniteQueries.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/utils/api';

export const useInfiniteRecommendedEvents = (userId: string) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.all, 'infinite', 'recommended', userId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/recommended', {
        params: { page: pageParam, limit: 10 }
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useInfiniteNearbyEvents = (lat: number, lng: number, distance: number) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.all, 'infinite', 'nearby', { lat, lng, distance }],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.get('/api/manageevents/eventslist/get/nearby/events', {
        params: { lat, lng, distance, skip: pageParam, limit: 10 }
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      const totalLoaded = pages.length * 10;
      return lastPage.hasMore ? totalLoaded : undefined;
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 3 * 60 * 1000,
  });
};
```

### 6. Utility Hooks

```typescript
// /hooks/useQueryUtils.ts
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/utils/queryKeys';
import { userQueryKeys } from './useUserQueries';

export const useQueryUtils = () => {
  const queryClient = useQueryClient();

  // Prefetch commonly needed data
  const prefetchEventDetails = (eventId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.eventById(eventId),
      queryFn: () => eventApi.getEventById(eventId),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Clear all caches (for logout)
  const clearAllCaches = () => {
    queryClient.clear();
  };

  // Invalidate user-related data (for profile updates)
  const invalidateUserData = () => {
    queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
  };

  // Invalidate event-related data (for event changes)
  const invalidateEventData = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents(userId), exact: false });
  };

  return {
    prefetchEventDetails,
    clearAllCaches,
    invalidateUserData,
    invalidateEventData,
  };
};
```

### 7. Categories and Static Data

```typescript
// /hooks/useStaticDataQueries.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';

export const staticQueryKeys = {
  categories: ['categories'] as const,
  cities: ['cities'] as const,
  weather: (lat: number, lng: number) => ['weather', { lat, lng }] as const,
};

export const useCategories = () => {
  return useQuery({
    queryKey: staticQueryKeys.categories,
    queryFn: async () => {
      const response = await api.get('/api/categories');
      return response.data.categories || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - categories don't change often
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep for a week
  });
};

export const useWeatherData = (lat?: number, lng?: number) => {
  return useQuery({
    queryKey: staticQueryKeys.weather(lat!, lng!),
    queryFn: async () => {
      const response = await api.get('/api/weather', {
        params: { lat, lng }
      });
      return response.data;
    },
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 10 * 60 * 1000, // 10 minutes for weather
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
  });
};
```

## Complete Query Client Setup

```typescript
// /utils/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401) return false;
        // Don't retry on not found
        if (error?.response?.status === 404) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // Default 5 minutes
      gcTime: 10 * 60 * 1000, // Default 10 minutes
      refetchOnWindowFocus: false, // Mobile doesn't need this
      refetchOnReconnect: true, // Good for mobile
    },
    mutations: {
      retry: 2,
      networkMode: 'offlineFirst',
      onError: (error: any) => {
        const message = error.response?.data?.message || error.message || 'An error occurred';
        if (error?.response?.status !== 401) {
          Alert.alert('Error', message);
        }
      }
    }
  }
});
```

This implementation provides a robust, scalable TanStack Query setup that leverages the backend's consistent response structure for perfect cache management and user experience. You now have hooks for:

- ✅ **Events** - Complete CRUD operations
- ✅ **Users** - Profile, friends, activities  
- ✅ **Notifications** - Real-time updates, read status
- ✅ **Search** - Debounced queries with caching
- ✅ **Static Data** - Categories, weather, etc.
- ✅ **Infinite Queries** - For paginated data
- ✅ **Utilities** - Cache management helpers

## Advanced & Specialized Hooks

### 1. AI Insights Hook

```typescript
// /hooks/useAIInsightsQuery.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useLocation } from '@/context/LocationContext';
import api from '@/utils/api';

interface InsightCard {
  title: string;
  subtitle: string;
  emoji: string;
  type: 'event' | 'social' | 'suggestion' | 'achievement';
  event?: any;
  weather?: any;
  traffic?: any;
  fullEventData?: any;
  cta?: {
    text: string;
    action: 'navigate' | 'create' | 'explore';
    target?: string;
  };
  priority: number;
}

export const useAIInsightsQuery = (options: {
  onFinishRefresh?: () => void;
  enabled?: boolean;
} = {}) => {
  const { userId } = useAuthSession();
  const { currentLocation } = useLocation();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['aiInsights', userId, currentLocation?.lat, currentLocation?.lng],
    queryFn: async (): Promise<InsightCard> => {
      try {
        const params = currentLocation ? {
          userLat: currentLocation.lat,
          userLng: currentLocation.lng,
        } : {};
        
        const response = await api.get('/api/ai/insights', { params });
        return response.data;
      } catch (error) {
        // Fallback insight on error
        return {
          title: "Welcome back!",
          subtitle: "Check out what's happening around you",
          emoji: "👋",
          type: "suggestion",
          cta: { text: "Explore Events", action: "explore" },
          priority: 5,
        };
      } finally {
        options.onFinishRefresh?.();
      }
    },
    enabled: options.enabled !== false && !!userId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const invalidateInsights = useCallback(async () => {
    try {
      await api.post('/api/ai/insights'); // Clear server cache
    } catch (error) {
      console.error('Failed to clear server-side cache:', error);
    }
    await queryClient.invalidateQueries({ queryKey: ['aiInsights', userId] });
  }, [queryClient, userId]);

  return { ...query, invalidateInsights };
};
```

### 2. Advanced Calendar Hooks

```typescript
// /hooks/useOptimalCalendarQuery.ts
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { Event, EventOccurrence } from '@/types/allTypes';
import { expandRecurringEvent } from '@/utils/eventUtils';
import { startOfMonth, endOfMonth, format, isWithinInterval } from 'date-fns';
import { queryKeys } from '@/utils/queryKeys';
import { eventApi } from '@/utils/queryFunctions';

export const useOptimalCalendarQuery = (
  currentDate: Date,
  currentView: 'Month' | 'Week' | 'Schedule',
  options: { staleTime?: number } = {}
) => {
  const queryClient = useQueryClient();
  const { userId } = useAuthSession();

  const queryConfig = useMemo(() => {
    const staleTime = options.staleTime || (
      currentView === 'Month' ? 10 * 60 * 1000 : 
      currentView === 'Week' ? 3 * 60 * 1000 : 
      5 * 60 * 1000
    );

    if (currentView === 'Month') {
      return {
        queryKey: queryKeys.calendarEvents(userId, currentDate.getMonth(), currentDate.getFullYear()),
        queryFn: () => eventApi.getCalendarEvents(userId, currentDate.getMonth(), currentDate.getFullYear()),
        staleTime,
      };
    } else {
      const startDate = currentView === 'Week' 
        ? new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay())
        : startOfMonth(currentDate);
      const endDate = currentView === 'Week'
        ? new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
        : endOfMonth(currentDate);
        
      return {
        queryKey: queryKeys.calendarRange(userId, startDate.toISOString(), endDate.toISOString()),
        queryFn: () => eventApi.getCalendarRange(userId, startDate.toISOString(), endDate.toISOString()),
        staleTime,
      };
    }
  }, [currentDate, currentView, options.staleTime, userId]);

  const eventsQuery = useQuery({
    queryKey: queryConfig.queryKey,
    queryFn: queryConfig.queryFn,
    staleTime: queryConfig.staleTime,
    enabled: !!userId,
  });

  // Process events into occurrences
  const occurrences = useMemo(() => {
    const events = eventsQuery.data || [];
    if (!events.length) return [];

    const allOccurrences: EventOccurrence[] = [];
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    
    for (const event of events) {
      if (event.isRecurringOccurrence && event.originalEventId) {
        // Already expanded occurrence
        const eventDate = new Date(event.start_time);
        allOccurrences.push({
          id: event._id,
          originalEventId: event.originalEventId,
          date: eventDate,
          event,
          isModified: false,
          isCancelled: false
        });
      } else {
        // Expand recurring event
        const occurrences = expandRecurringEvent(event, startDate, endDate, []);
        allOccurrences.push(...occurrences);
      }
    }
    
    return allOccurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [eventsQuery.data, currentDate]);

  // Helper functions
  const getOccurrencesForDate = useMemo(() => {
    return (date: Date): EventOccurrence[] => {
      const targetDate = format(date, 'yyyy-MM-dd');
      return occurrences.filter(occurrence => 
        format(occurrence.date, 'yyyy-MM-dd') === targetDate
      );
    };
  }, [occurrences]);

  const groupedByDate = useMemo(() => {
    return occurrences.reduce((acc, occurrence) => {
      const dateKey = format(occurrence.date, 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(occurrence);
      return acc;
    }, {} as Record<string, EventOccurrence[]>);
  }, [occurrences]);

  return {
    events: eventsQuery.data || [],
    occurrences,
    loading: eventsQuery.isLoading,
    error: eventsQuery.error,
    getOccurrencesForDate,
    groupedByDate,
    refetch: eventsQuery.refetch,
    invalidateCalendarQueries: () => {
      queryClient.invalidateQueries({ queryKey: queryConfig.queryKey });
    },
  };
};
```

### 3. Event Actions Integration Hook

```typescript
// /hooks/useEventActions.ts
import { useCallback } from 'react';
import { useAIInsightsQuery } from './useAIInsightsQuery';

export const useEventActions = () => {
  const { invalidateInsights } = useAIInsightsQuery({ enabled: false });

  const afterEventAction = useCallback(async (actionType: string) => {
    console.log(`Event action performed: ${actionType} - invalidating AI insights`);
    setTimeout(async () => {
      await invalidateInsights();
    }, 500);
  }, [invalidateInsights]);

  return {
    afterJoinEvent: useCallback(() => afterEventAction('joinEvent'), [afterEventAction]),
    afterCreateEvent: useCallback(() => afterEventAction('createEvent'), [afterEventAction]),
    afterUpdateEvent: useCallback(() => afterEventAction('updateEvent'), [afterEventAction]),
    afterCancelEvent: useCallback(() => afterEventAction('cancelEvent'), [afterEventAction]),
    afterLeaveEvent: useCallback(() => afterEventAction('leaveEvent'), [afterEventAction]),
  };
};
```

### 4. Event Reporting Hook

```typescript
// /hooks/useEventReport.ts
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import { Alert } from 'react-native';

type ReportReason = 'spam' | 'inappropriate' | 'abuse' | 'false_information' | 'other';

export const useEventReport = () => {
  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      const response = await api.post('/api/manageevents/eventslist/report', variables);
      return response.data;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to report event';
      Alert.alert('Error', message);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Event reported successfully');
    },
  });
};
```

### 5. Infinite Query Cache Utilities

```typescript
// /utils/infiniteQueryUtils.ts
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export const updateInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  newEvent: any,
  userId?: string
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any, pageIndex: number) => {
      if (pageIndex === 0) {
        return {
          ...page,
          events: [newEvent, ...page.events],
          totalCount: page.totalCount + 1,
        };
      }
      return page;
    });
    
    return { ...oldData, pages: newPages };
  });
};

export const removeFromInfiniteQueryCache = (
  queryClient: QueryClient,
  eventType: string,
  eventId: string,
  userId?: string
) => {
  const queryKey = queryKeys.infiniteEvents(eventType, { userId });
  
  queryClient.setQueryData(queryKey, (oldData: any) => {
    if (!oldData) return oldData;
    
    const newPages = oldData.pages.map((page: any) => ({
      ...page,
      events: page.events.filter((event: any) => event._id !== eventId),
      totalCount: Math.max(0, page.totalCount - 1),
    }));
    
    return { ...oldData, pages: newPages };
  });
};
```