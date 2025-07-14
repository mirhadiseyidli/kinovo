import { useState, useEffect, useRef } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';

const useSearchEverythingDiscovery = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);

    const fetchDiscoverySearchResults = async (query: string) => {
        // Cancel any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        
        try {
            // Use 'query' parameter for both endpoints as expected by the server
            const [usersResponse, eventsResponse] = await Promise.all([
                api.get(`/api/search/users?query=${encodeURIComponent(query)}`, {
                    signal: abortControllerRef.current.signal
                }),
                api.get(`/api/search/events?query=${encodeURIComponent(query)}`, {
                    signal: abortControllerRef.current.signal
                })
            ]);

            // Server returns users array directly, events array directly
            const results = { 
                users: usersResponse.data || [], 
                events: eventsResponse.data || []
            };
            

            return results;
        } catch (error) {
            const err = error as ApiError;
            
            // Don't show error for aborted requests
            if (err.name === 'AbortError' || err.message?.includes('aborted')) {
                return { users: [], events: [] };
            }
            
            console.error('Search error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                url: err.config?.url
            }); // Better error logging
            
            console.error('Failed to fetch data:', err.message);
            if (mountedRef.current) {
                setError(err.message);
            }
            return { users: [], events: [] };
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    return { fetchDiscoverySearchResults, loading, error };
};

export default useSearchEverythingDiscovery;
