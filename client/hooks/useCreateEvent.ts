import { Alert } from 'react-native';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';

export const useCreateEvent = () => {
  const postCreateEvent = async (eventData: Partial<Event>) => {
    try {
      // If we have an _id, this is an update operation
      if (eventData._id) {
        // Use the same endpoint as for creating events, but include the event ID in the payload
        // This works because the server can detect updates based on the presence of an _id
        const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
        return response.data;
      } else {
        // Otherwise it's a create operation
        const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
        return response.data;
      }
    } catch (error: any) {
      console.error('Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event');
      throw error;
    }
  };

  return {
    postCreateEvent
  };
};