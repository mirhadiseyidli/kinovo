import { useState, useEffect } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';

const useSearchEverythingDiscovery = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDiscoverySearchResults = async (query: string) => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('Starting search with query:', query); // Debug log
            
            // Use 'query' parameter for both endpoints as expected by the server
            const [usersResponse, eventsResponse] = await Promise.all([
                api.get(`/api/search/users?query=${encodeURIComponent(query)}`),
                api.get(`/api/search/events?query=${encodeURIComponent(query)}`)
            ]);

            console.log('Users response:', usersResponse.data); // Debug log
            console.log('Events response:', eventsResponse.data); // Debug log
            console.log('Events response status:', eventsResponse.status); // Debug log

            // Server returns users array directly, events array directly
            const results = { 
                users: usersResponse.data || [], 
                events: eventsResponse.data || []
            };
            
            console.log('Final search results:', results); // Debug log
            console.log('Events count:', results.events.length); // Debug log
            return results;
        } catch (error) {
            const err = error as ApiError;
            console.error('Search error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                url: err.config?.url
            }); // Better error logging
            
            console.error('Failed to fetch data:', err.message);
            setError(err.message);
            return { users: [], events: [] };
        } finally {
            setLoading(false);
        }
    };

    return { fetchDiscoverySearchResults, loading, error };
};

export default useSearchEverythingDiscovery;
