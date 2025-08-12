import { useMemo } from 'react';
import { useEventsStore } from './useEventsStore';
import { EventWithTags } from '@/utils/eventStore';
import { useCreateEvent, useUpdateEvent, useDeleteEvent, useLeaveEvent, useUpdateEventStatus, useJoinEvent, useRespondToInvitation } from './useNewEventMutations';
import { useNotInterestedEvent, useCancelEvent, useRemoveAttendee, useReportEvent } from './useSpecialMutations';
import { useBatchMutations } from './useBatchMutations';
import { useSpecialQueries } from './useSpecialQueries';
import { 
  useUpcomingEvents,
  usePastEvents,
  useFriendsEvents,
  useNearbyEvents,
  useUserEvents,
  useAttentionRequiredEvents,
  useRecommendedEvents,
  useJoinedEvents,
  useCreatedEvents,
  useInvitedEvents,
  useCategoryEvents,
  useCityEvents
} from './useEvents';

// Main events hook - provides all event data and mutations
export const useMainEvents = () => {
  const store = useEventsStore();
  const batchMutations = useBatchMutations();
  
  // Individual mutations
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const leaveEvent = useLeaveEvent();
  const updateEventStatus = useUpdateEventStatus();
  const respondToInvitation = useRespondToInvitation();
  const joinEvent = useJoinEvent();
  const notInterestedEvent = useNotInterestedEvent();
  const cancelEvent = useCancelEvent();
  const removeAttendee = useRemoveAttendee();
  const reportEvent = useReportEvent();
  
  return {
    // Core data
    ...store,
    
    // All mutations
    createEvent,
    updateEvent,
    deleteEvent,
    leaveEvent,
    updateEventStatus,
    respondToInvitation,
    joinEvent,
    notInterestedEvent,
    cancelEvent,
    removeAttendee,
    reportEvent,
    ...batchMutations,
    
    // Combined loading state
    loading: store.isLoading || batchMutations.loading,
    
    // Combined error state
    error: store.error || batchMutations.error,
  };
};

// Dashboard hook - combines all data needed for main dashboard
export const useDashboardData = (userLocation?: { latitude: number; longitude: number }) => {
  const upcomingEvents = useUpcomingEvents();
  const friendsEvents = useFriendsEvents();
  const nearbyEvents = useNearbyEvents(
    userLocation?.latitude, 
    userLocation?.longitude
  );
  const specialQueries = useSpecialQueries();
  
  return {
    upcomingEvents,
    friendsEvents: friendsEvents.events.slice(0, 5), // Limit for dashboard
    nearbyEvents: nearbyEvents.data?.events?.slice(0, 5) || [], // Limit for dashboard
    aiRecommendations: specialQueries.aiRecommendations?.slice(0, 3), // Limit for dashboard
    trendingEvents: specialQueries.trendingEvents?.slice(0, 3), // Limit for dashboard
    insights: specialQueries.eventInsights,
    
    loading: specialQueries.loading,
    error: specialQueries.error,
  };
};

// Profile hook - combines user-specific event data
export const useProfileData = (targetUserId?: string) => {
  const userEvents = useUserEvents(targetUserId || '');
  const createdEvents = useCreatedEvents();
  const joinedEvents = useJoinedEvents();
  const pastEvents = usePastEvents();
  const specialQueries = useSpecialQueries();
  
  return {
    userEvents,
    createdEvents,
    joinedEvents,
    pastEvents,
    stats: specialQueries.eventStats,
    insights: specialQueries.eventInsights,
    
    // Summary counts
    totalCreated: createdEvents.events.length,
    totalJoined: joinedEvents.events.length,
    totalPast: pastEvents.events.length,
    
    loading: specialQueries.loading,
    error: specialQueries.error,
  };
};

// Discovery hook - combines data for event discovery
export const useDiscoveryData = (filters?: {
  category?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}) => {
  const nearbyEvents = useNearbyEvents(filters?.latitude, filters?.longitude);
  const categoryEvents = useCategoryEvents(filters?.category);
  const cityEvents = useCityEvents(filters?.city);
  const recommendedEvents = useRecommendedEvents();
  const specialQueries = useSpecialQueries();
  
  return {
    nearbyEvents,
    categoryEvents,
    cityEvents,
    recommendedEvents,
    trendingEvents: specialQueries.trendingEvents,
    aiRecommendations: specialQueries.aiRecommendations,
    
    loading: specialQueries.loading,
    error: specialQueries.error,
  };
};

// Social hook - combines friend-related event data
export const useSocialData = () => {
  const friendsEvents = useFriendsEvents();
  const invitedEvents = useInvitedEvents();
  const joinedEvents = useJoinedEvents();
  const specialQueries = useSpecialQueries();
  
  return {
    friendsEvents,
    invitedEvents,
    joinedEvents,
    insights: specialQueries.eventInsights,
    
    // Social metrics
    friendsEventsCount: friendsEvents.events.length,
    invitationsCount: invitedEvents.events.length,
    joinedCount: joinedEvents.events.length,
    
    loading: specialQueries.loading,
    error: specialQueries.error,
  };
};

// Analytics hook - combines all analytics data
export const useAnalyticsData = () => {
  const { data: events = [] } = useEventsStore();
  const specialQueries = useSpecialQueries();
  
  const analytics = useMemo(() => {
    if (!events.length) return null;
    
    return {
      // Time-based analytics
      eventsThisMonth: events.filter((e: EventWithTags) => {
        const eventDate = new Date(e.start_time || '');
        const now = new Date();
        return eventDate.getMonth() === now.getMonth() && 
               eventDate.getFullYear() === now.getFullYear();
      }).length,
      
      eventsThisWeek: events.filter((e: EventWithTags) => {
        const eventDate = new Date(e.start_time || '');
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        return eventDate >= weekStart;
      }).length,
      
      // Engagement analytics
      attendanceRate: events.filter((e: EventWithTags) => e._tags?.has('participating')).length / events.length,
      creationRate: events.filter((e: EventWithTags) => e._tags?.has('created')).length / events.length,
      
      // Category performance
      topCategories: Object.entries(specialQueries.eventInsights?.categoryCounts || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5),
        
      // Location analytics
      topCities: Object.entries(specialQueries.eventInsights?.cityCounts || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5),
    };
  }, [events, specialQueries.eventInsights]);
  
  return {
    analytics,
    insights: specialQueries.eventInsights,
    stats: specialQueries.eventStats,
    
    loading: specialQueries.loading,
    error: specialQueries.error,
  };
};

// Master hook that provides everything (use sparingly)
export const useAllEventData = () => {
  const mainEvents = useMainEvents();
  const specialQueries = useSpecialQueries();
  
  return {
    ...mainEvents,
    ...specialQueries,
    
    // Helper functions
    getEventById: (id: string) => mainEvents.data?.find(e => e._id === id),
    getEventsByTag: (tag: string) => mainEvents.data?.filter(e => e._tags?.has(tag)) || [],
    getEventsByCategory: (category: string) => mainEvents.data?.filter(e => e.category === category) || [],
    getEventsByCity: (city: string) => mainEvents.data?.filter(e => e.location?.city === city) || [],
  };
};