import { Alert } from 'react-native';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useCreateEvent = () => {
  const postCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event');
      throw error;
    }
  };

  return {
    postCreateEvent
  };
};