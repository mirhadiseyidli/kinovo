import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useLocation } from '@/context/LocationContext';
import api from '@/utils/api';

/**
 * TanStack React Query hook for fetching AI insights
 * Following the same pattern as useUpcomingEventsQuery
 */

// Define insight card type
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

interface InsightCard {
  title: string;
  subtitle: string;
  emoji: string;
  type: 'event' | 'social' | 'suggestion' | 'achievement';
  event?: EventCard;
  weather?: WeatherCard;
  traffic?: TrafficCard;
  fullEventData?: any; // Complete event object with attendees from backend
  cta?: {
    text: string;
    action: 'navigate' | 'create' | 'explore';
    target?: string;
  };
  priority: number;
}

interface UseAIInsightsOptions {
  onFinishRefresh?: () => void;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const useAIInsightsQuery = (options: UseAIInsightsOptions = {}) => {
  const { userId } = useAuthSession();
  const { currentLocation } = useLocation();
  const queryClient = useQueryClient();
  
  const {
    onFinishRefresh,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes (same as server-side cache)
    gcTime = 10 * 60 * 1000, // 10 minutes
  } = options;

  // Create query function with onFinishRefresh callback
  const aiInsightsQueryFn = useCallback(async ({ signal }: { signal?: AbortSignal } = {}): Promise<InsightCard> => {
    try {
      // Include user's current location for traffic calculations
      const params = currentLocation ? {
        userLat: currentLocation.lat,
        userLng: currentLocation.lng,
      } : {};
      
      console.log('🗺️ Sending location to AI Insights:', params);
      console.log('🗺️ Current location object:', currentLocation);
      
      const response = await api.get('/api/ai/insights', { 
        signal,
        params 
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch AI insight:', error);
      
      // Return fallback insight on error (same as original implementation)
      const fallbackInsight: InsightCard = {
        title: "Welcome back!",
        subtitle: "Check out what's happening around you",
        emoji: "👋",
        type: "suggestion",
        cta: {
          text: "Explore Events",
          action: "explore",
        },
        priority: 5,
      };
      return fallbackInsight;
    } finally {
      // Call onFinishRefresh if provided (for pull-to-refresh completion)
      if (onFinishRefresh) {
        onFinishRefresh();
      }
    }
  }, [onFinishRefresh, currentLocation]);

  // Cache invalidation function
  const invalidateInsights = useCallback(async () => {
    try {
      // Clear server-side cache
      await api.post('/api/ai/insights');
      console.log('✅ Server-side insights cache cleared');
    } catch (error) {
      console.error('Failed to clear server-side cache:', error);
    }
    
    // Clear client-side cache
    await queryClient.invalidateQueries({ queryKey: ['aiInsights', userId] });
    console.log('✅ Client-side insights cache cleared');
  }, [queryClient, userId]);

  const query = useQuery({
    queryKey: ['aiInsights', userId, currentLocation?.lat, currentLocation?.lng],
    queryFn: aiInsightsQueryFn,
    enabled: enabled && !!userId,
    staleTime,
    gcTime,
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // 1 second delay before retry
  });

  return {
    ...query,
    invalidateInsights,
  };
};