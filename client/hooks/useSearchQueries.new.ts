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