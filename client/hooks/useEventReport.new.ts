import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import { Alert } from 'react-native';

type ReportReason = 'spam' | 'inappropriate' | 'abuse' | 'false_information' | 'other';

export const useEventReport = () => {
  return useMutation({
    mutationFn: async (variables: {
      eventId: string;
      reason: ReportReason;
      details?: string;
    }) => {
      const response = await api.post('/api/manageevents/eventslist/report', variables);
      return response.data;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to report event';
      Alert.alert('Error', message);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Event reported successfully');
    },
  });
};