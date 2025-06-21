import { Alert } from 'react-native';
import { Event } from '@/types/allTypes';
import api from '@/utils/api';

// Define an interface for the update request data that includes the optional fields
interface UpdateEventRequestData extends Partial<Event> {
  occurrenceDate?: Date | string;
  modifyType?: 'this_only' | 'this_and_future' | 'all_instances';
}

export const useCreateEvent = () => {
  const postCreateEvent = async (eventData: Partial<Event>) => {
    try {
      // Always use the create endpoint for new events
      const response = await api.post('/api/manageevents/eventslist/create/new/event', eventData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event');
      throw error;
    }
  };

  const updateEvent = async (
    eventId: string,
    eventData: Partial<Event>,
    options?: {
      occurrenceDate?: Date | string;
      modifyType?: 'this_only' | 'this_and_future' | 'all_instances';
    }
  ) => {
    try {
      let requestData: UpdateEventRequestData = { ...eventData };
      
      // Add options if provided
      if (options?.occurrenceDate) {
        requestData.occurrenceDate = options.occurrenceDate;
      }
      if (options?.modifyType) {
        requestData.modifyType = options.modifyType;
      }
      
      const response = await api.put(`/api/manageevents/eventslist/update/${eventId}`, requestData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
      throw error;
    }
  };

  return {
    postCreateEvent,
    updateEvent
  };
};