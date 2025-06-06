import { useState } from 'react';
import { AxiosError } from 'axios';
import api from '@/utils/api';
import { useAuthSession } from '@/components/Auth/AuthProvider';

interface AccountDeletionHook {
  requestDeletion: () => Promise<void>;
  cancelDeletion: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface ErrorResponse {
  message: string;
}

export const useAccountDeletion = (): AccountDeletionHook => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuthSession();

  const requestDeletion = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await api.post('/api/users/delete-account');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(axiosError.response?.data?.message || 'Failed to request account deletion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeletion = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await api.post('/api/users/cancel-deletion');
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(axiosError.response?.data?.message || 'Failed to cancel account deletion');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    requestDeletion,
    cancelDeletion,
    isLoading,
    error,
  };
}; 