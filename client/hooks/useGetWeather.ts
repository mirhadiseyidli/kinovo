import { useCallback, useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { ApiError } from '@/types/allTypes';

export const useGetWeather = (lat: number | null, lon: number | null) => {
  const { refreshAccessToken } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (lat === null || lon === null) return;

    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/weather/get/location/weather`,
        {
          params: { lat, lon },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const temp = Math.round(response.data?.currentWeather?.temperature);
      setTemperature(temp);
    } catch (error) {
      const err = error as ApiError;
      if (err.response?.status === 401) {
        try {
          await refreshAccessToken();
          const retryToken = await AsyncStorage.getItem('accessToken');
          const retryResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/weather/get/location/weather`,
            {
              params: { lat, lon },
              headers: { Authorization: `Bearer ${retryToken}` },
            }
          );
          const temp = Math.round(retryResponse.data?.currentWeather?.temperature);
          setTemperature(temp);
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError);
          setError('Failed to refresh access token.');
        }
      } else {
        console.error('Failed to fetch weather data:', err.message);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lon, refreshAccessToken]);

  return { fetchWeather, loading, temperature, error };
};
