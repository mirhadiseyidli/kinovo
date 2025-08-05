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