import { useState, useCallback } from 'react';
import { ApiError } from '@/types/allTypes';
import api from '@/utils/api';

export interface Category {
  _id: string;
  name: string;
  icon?: string;
}

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/categories');
      if (response.data.categories) {
        setCategories(response.data.categories);
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
  }, []);

  return { categories, fetchCategories, loading, error };
}; 