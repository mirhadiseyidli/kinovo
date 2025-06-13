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
            // Use 'query' parameter for both endpoints as expected by the server
            const [usersResponse, eventsResponse] = await Promise.all([
                api.get(`/api/search/users?query=${encodeURIComponent(query)}`),
                api.get(`/api/search/events?query=${encodeURIComponent(query)}`)
            ]);

            // Server returns users array directly, events array directly
            const results = { 
                users: usersResponse.data || [], 
                events: eventsResponse.data || []
            };
            

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
