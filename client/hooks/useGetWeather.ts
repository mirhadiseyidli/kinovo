import { useCallback, useState, useEffect, useRef } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';

export const useGetWeather = (lat: number | null, lon: number | null) => {
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState<number | null>(null);
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

  const fetchWeather = useCallback(async () => {
    if (lat === null || lon === null) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/weather/get/location/weather', {
        params: { lat, lon },
        signal: abortControllerRef.current.signal
      });
      const tempCelsius = response.data?.currentWeather?.temperature;
      const tempFahrenheit = tempCelsius ? Math.round((tempCelsius * 9/5) + 32) : null;
      
      if (mountedRef.current) {
        setTemperature(tempFahrenheit);
      }
    } catch (error) {
      const err = error as ApiError;
      
      // Don't show error for aborted requests
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      
      console.error('Failed to fetch weather:', err.message);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [lat, lon]);

  return { fetchWeather, loading, temperature, error };
};
