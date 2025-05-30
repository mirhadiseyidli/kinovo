import { useCallback, useState } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetWeather = (lat: number | null, lon: number | null) => {
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (lat === null || lon === null) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/weather/get/location/weather', {
        params: { lat, lon },
      });
      const temp = Math.round(response.data?.currentWeather?.temperature);
      setTemperature(temp);
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch weather:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  return { fetchWeather, loading, temperature, error };
};
