import { useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api';
import { ApiError } from '@/types/allTypes';

export const useEventInvitation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respondToInvitation = async (
    eventId: string, 
    status: 'accepted' | 'maybe' | 'rejected',
    options?: {
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestBody: any = {
        eventId,
        status
      };

      // Add recurring event options if provided
      if (options?.occurrenceDate) {
        requestBody.occurrenceDate = options.occurrenceDate;
      }
      if (options?.modifyType) {
        requestBody.modifyType = options.modifyType;
      }

      const response = await api.post('/api/manageevents/eventslist/respond/invitation', requestBody);
      
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.response?.data?.message || err.message || 'Failed to respond to invitation';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelEvent = async (
    eventId: string,
    options?: {
      occurrenceDate?: string;
      modifyType?: 'this_only' | 'all_future';
    }
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestBody: any = {
        eventId
      };

      // Add recurring event options if provided
      if (options?.occurrenceDate) {
        requestBody.occurrenceDate = options.occurrenceDate;
      }
      if (options?.modifyType) {
        requestBody.modifyType = options.modifyType;
      }

      const response = await api.post('/api/manageevents/eventslist/cancel/event', requestBody);
      
      return response.data;
    } catch (error) {
      const err = error as ApiError;
      const errorMessage = err.response?.data?.message || err.message || 'Failed to cancel event';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    respondToInvitation,
    cancelEvent,
    loading,
    error
  };
}; 