import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useLocation } from '@/context/LocationContext';
import api from '@/utils/api';

interface EventCard {
  eventId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  category: string;
}

interface WeatherCard {
  temperature: string;
  condition: string;
  emoji: string;
  recommendation: string;
}

interface TrafficCard {
  duration: string;
  condition: string;
  emoji: string;
  recommendation: string;
}

export interface InsightCard {
  title: string;
  subtitle: string;
  emoji: string;
  type: 'event' | 'social' | 'suggestion' | 'achievement';
  event?: EventCard;
  weather?: WeatherCard;
  traffic?: TrafficCard;
  fullEventData?: any;
  cta?: {
    text: string;
    action: 'navigate' | 'create' | 'explore';
    target?: string;
  };
  priority: number;
}

interface UseAIInsightsOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
  staleTime?: number;
  refetchInterval?: number;
}

// Fetch function for TanStack Query
const fetchAIInsights = async (
  currentLocation?: { lat: number | null; lng: number | null } | null, 
  skipCache: boolean = false,
  signal?: AbortSignal
): Promise<InsightCard> => {
  const params: any = {};
  
  if (currentLocation && currentLocation.lat !== null && currentLocation.lng !== null) {
    params.userLat = currentLocation.lat;
    params.userLng = currentLocation.lng;
  }
  
  if (skipCache) {
    params['pull-to-refresh'] = 'true';
  }

  const response = await api.get('/api/ai/insights', { 
    params,
    signal
  });

  return response.data;
};

// Fallback insights for error states
const getFallbackInsights = (): InsightCard => ({
  title: "Welcome back!",
  subtitle: "Check out what's happening around you",
  emoji: "👋",
  type: "suggestion",
  cta: {
    text: "Explore Events",
    action: "explore",
  },
  priority: 5,
});

export const useAIInsights = (options: UseAIInsightsOptions = {}) => {
  const { 
    enabled = true, 
    onError,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchInterval = false 
  } = options;
  
  const { userId } = useAuthSession();
  const { currentLocation } = useLocation();
  const queryClient = useQueryClient();

  const query = useQuery<InsightCard, Error>({
    queryKey: ['ai-insights', userId, currentLocation?.lat, currentLocation?.lng],
    queryFn: ({ signal }) => fetchAIInsights(currentLocation, false, signal),
    enabled: enabled && !!userId,
    staleTime,
    refetchInterval: refetchInterval || undefined,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    throwOnError: true,
  });

  // Handle errors
  if (query.error) {
    console.error('AI Insights fetch error:', query.error);
    onError?.(query.error);
  }

  // Return fallback insights if there's an error
  const insights = query.error ? getFallbackInsights() : query.data;

  // Function to refresh with cache invalidation
  const refreshWithCacheInvalidation = useCallback(async () => {
    try {
      // Manually fetch with cache invalidation and update the query cache
      const freshData = await fetchAIInsights(currentLocation, true);
      
      // Update the query cache with the fresh data
      queryClient.setQueryData(
        ['ai-insights', userId, currentLocation?.lat, currentLocation?.lng],
        freshData
      );
      
      return { data: freshData };
    } catch (error) {
      console.error('Error refreshing with cache invalidation:', error);
      throw error;
    }
  }, [currentLocation, queryClient, userId]);

  return {
    insights,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message || null,
    refetch: query.refetch,
    refreshWithCacheInvalidation,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
};