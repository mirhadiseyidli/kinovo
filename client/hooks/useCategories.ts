import { useState, useCallback, useEffect } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

export interface Category {
  _id: string;
  name: string;
  icon?: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstFetch, setIsFirstFetch] = useState(true);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const { userId } = useAuthSession();

  const fetchCategories = useCallback(async () => {
    // If we have fetched data before, this is not a first fetch
    if (hasDataBeenFetched) {
      setIsFirstFetch(false);
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/categories');
      if (response.data.categories) {
        setCategories(response.data.categories);
        setIsFirstFetch(false); // First fetch completed
        setHasDataBeenFetched(true);
        return response.data.categories;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const err = error as ApiError;
      console.error('Failed to fetch categories:', err.message);
      setError(err.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [hasDataBeenFetched]);

  // Reset first fetch state when user changes
  useEffect(() => {
    if (userId) {
      setIsFirstFetch(true);
      setHasDataBeenFetched(false);
    }
  }, [userId]);

  return { 
    categories, 
    fetchCategories, 
    loading, 
    isFirstFetch,
    error 
  };
}; 