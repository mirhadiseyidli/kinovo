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