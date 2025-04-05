import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { Event } from '@/types/allTypes';

export const useCreateEvent = () => {
  const { refreshAccessToken } = useAuthSession();

  const postCreateEvent = async (eventData: Partial<Event>) => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/create/new/event`,
        eventData,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshAccessToken();
        const retryAccessToken = await AsyncStorage.getItem('accessToken');
        if (!retryAccessToken) throw new Error('No access token available');

        const retryResponse = await axios.post(
          `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/manageevents/eventslist/create/new/event`,
          eventData,
          {
            headers: { Authorization: `Bearer ${retryAccessToken}` },
          }
        );

        return retryResponse.data;
      } else {
        Alert.alert('Error', 'Failed to create event');
      }
    }
  };

  return {
    postCreateEvent
  };
};