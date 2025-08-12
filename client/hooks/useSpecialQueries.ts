import { useQuery } from '@tanstack/react-query';
import { useEventsStore } from './useEventsStore';
import { useMemo } from 'react';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { Event } from '@/types/allTypes';
import { EventWithTags } from '@/utils/eventStore';

// AI Event Recommendations based on main store
export const useAIRecommendations = () => {
  const eventsStoreQuery = useEventsStore();
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'ai-recommendations', userId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement AI recommendations endpoint
      const response = await api.get('/api/ai/recommend-events');
      return response.data.events || [];
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 10 * 60 * 1000, // AI recommendations can be cached longer
    select: (data) => {
      // Filter out events that are already in our main store
      const existingEvents = eventsStoreQuery.data || [];
      const existingEventIds = new Set(existingEvents.map((e: EventWithTags) => e._id));
      return data.filter((event: Event) => !existingEventIds.has(event._id));
    }
  });
};

// Event Statistics
export const useEventStats = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'stats', userId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement stats endpoint
      const response = await api.get('/api/manageevents/stats');
      return response.data.stats || {};
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 15 * 60 * 1000,
  });
};

// Event Insights (based on main store for real-time analysis)
export const useEventInsights = () => {
  const eventsStoreQuery = useEventsStore();
  
  return useMemo(() => {
    const events = eventsStoreQuery.data || [];
    if (!events.length) return null;
    
    const insights = {
      totalEvents: events.length,
      upcomingEvents: events.filter((e: EventWithTags) => e._tags?.has('upcoming')).length,
      pastEvents: events.filter((e: EventWithTags) => e._tags?.has('past')).length,
      friendsEvents: events.filter((e: EventWithTags) => e._tags?.has('friends')).length,
      joinedEvents: events.filter((e: EventWithTags) => e._tags?.has('joined')).length,
      createdEvents: events.filter((e: EventWithTags) => e._tags?.has('created')).length,
      categoryCounts: {} as Record<string, number>,
      cityCounts: {} as Record<string, number>,
    };
    
    // Calculate category distribution
    events.forEach((event: EventWithTags) => {
      const category = event.category || 'Other';
      insights.categoryCounts[category] = (insights.categoryCounts[category] || 0) + 1;
    });
    
    // Calculate city distribution
    events.forEach((event: EventWithTags) => {
      const city = event.location?.city || 'Unknown';
      insights.cityCounts[city] = (insights.cityCounts[city] || 0) + 1;
    });
    
    return insights;
  }, [eventsStoreQuery.data]);
};

// Trending Events (not in main store)
export const useTrendingEvents = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'trending', userId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement trending events endpoint
      const response = await api.get('/api/manageevents/trending');
      return response.data.events || [];
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 30 * 60 * 1000, // Trending can be cached longer
  });
};

// Event Suggestions based on location/interests
export const useEventSuggestions = (latitude?: number, longitude?: number) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'suggestions', userId, latitude, longitude],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement location-based suggestions endpoint
      const response = await api.get('/api/manageevents/suggestions', {
        params: { latitude, longitude }
      });
      return response.data.events || [];
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 20 * 60 * 1000,
  });
};

// Similar Events (based on a specific event)
export const useSimilarEvents = (eventId: string, category?: string) => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'similar', eventId, category, userId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement similar events endpoint
      const response = await api.get(`/api/manageevents/similar/${eventId}`, {
        params: { category }
      });
      return response.data.events || [];
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 20 * 60 * 1000,
  });
};

// Event Attendance Analytics
export const useAttendanceAnalytics = (eventId: string) => {
  return useQuery({
    queryKey: ['events', 'analytics', 'attendance', eventId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement attendance analytics endpoint
      const response = await api.get(`/api/manageevents/analytics/attendance/${eventId}`);
      return response.data.analytics || {};
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 5 * 60 * 1000,
  });
};

// Popular Categories
export const usePopularCategories = () => {
  const { userId } = useAuthSession();
  
  return useQuery({
    queryKey: ['events', 'popular-categories', userId],
    queryFn: async () => {
      // TODO: This endpoint doesn't exist - need to implement popular categories endpoint
      const response = await api.get('/api/manageevents/popular-categories');
      return response.data.categories || [];
    },
    enabled: false, // Disabled until endpoint is implemented
    staleTime: 60 * 60 * 1000, // Categories change slowly
  });
};

// Combined special queries hook
export const useSpecialQueries = () => {
  const aiRecommendations = useAIRecommendations();
  const eventStats = useEventStats();
  const eventInsights = useEventInsights();
  const trendingEvents = useTrendingEvents();
  
  return {
    aiRecommendations: aiRecommendations.data,
    eventStats: eventStats.data,
    eventInsights,
    trendingEvents: trendingEvents.data,
    
    loading: aiRecommendations.isLoading || eventStats.isLoading || trendingEvents.isLoading,
    error: aiRecommendations.error || eventStats.error || trendingEvents.error,
    
    // Expose individual queries
    aiRecommendationsQuery: aiRecommendations,
    eventStatsQuery: eventStats,
    trendingEventsQuery: trendingEvents,
  };
};