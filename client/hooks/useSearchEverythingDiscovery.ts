import { useState, useEffect } from 'react';
import { ApiError } from '@/types/allTypes';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSearchEverythingDiscovery = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { refreshAccessToken } = useAuthSession();

    const fetchDiscoverySearchResults = async (query: string) => {
        setLoading(true);
        setError(null);
        
        try {
            const token = await AsyncStorage.getItem('accessToken');
            const usersResponse = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/search/users?query=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const eventsResponse = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/search/discover/search/everything?query=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const results = { users: usersResponse.data, events: eventsResponse.data};
            return results;
        } catch (error) {
          const err = error as ApiError;
          if (err.response?.status === 401) {
            try {
              await refreshAccessToken();
              const retryToken = await AsyncStorage.getItem('accessToken');

              const usersResponse = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/search/users?query=${query}`, {
                  headers: { Authorization: `Bearer ${retryToken}` }
              });

              const eventsResponse = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/search/discover/search/everything?query=${query}`, {
                  headers: { Authorization: `Bearer ${retryToken}` }
              });

              const results = { users: usersResponse.data, events: eventsResponse.data};
              return results;
            } catch (retryError) {
              console.error('Retry after token refresh failed:', retryError);
              setError('Failed to refresh access token.');
            }
          } else {
            console.error('Failed to fetch data:', err.message);
            setError(err.message);
          }
        } finally {
          setLoading(false);
        }
    };

    return { fetchDiscoverySearchResults, loading, error };
};

export default useSearchEverythingDiscovery;
