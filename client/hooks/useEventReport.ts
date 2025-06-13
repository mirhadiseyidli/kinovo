import { useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api';
import { ApiError } from '@/types/allTypes';

type ReportReason = 'spam' | 'inappropriate' | 'abuse' | 'false_information' | 'other';

export const useEventReport = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportEvent = async (
    eventId: string,
    reason: ReportReason,
    details?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestBody = {
        eventId,
        reason,
        details
      };

      const response = await api.post('/api/manageevents/eventslist/report', requestBody);
      
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.response?.data?.message || err.message || 'Failed to report event';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    reportEvent,
    loading,
    error
  };
}; 