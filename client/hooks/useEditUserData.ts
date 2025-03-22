import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';

export const useEditUserProfile = ({
  firstName,
  lastName,
  bio,
  locationCity,
  locationState,
  locationInput,
  locationLatitude,
  locationLongitude,
  instagramUsername,
  facebookUsername
}: {
  firstName: string;
  lastName: string;
  bio: string;
  locationCity: string;
  locationState: string;
  locationInput: string;
  locationLatitude: string | null;
  locationLongitude: string | null;
  instagramUsername: string;
  facebookUsername: string;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      await editMyProfile();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  const editMyProfile = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const updatedProfile = {
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        location: {
          city: locationCity,
          state: locationState,
          text: locationInput,
          coordinates: {
            lng: locationLongitude,
            lat: locationLatitude,
          }
        },
        social_handles: {
          instagram: {
            username: instagramUsername,
          },
          facebook: {
            username: facebookUsername,
          }
        }
      };

      const response = await axios.patch(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/edit/myprofile`,
        updatedProfile,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log('Profile updated successfully:', response.data);
    } catch (error: any) {
      console.error('Profile update failed:', error.response?.data?.message || error.message);

      if (error.response?.status === 401) {
        console.log('Access token expired, refreshing token...');
        await refreshToken();
        await editMyProfile(); // Retry request after refreshing token
      }
    } finally {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      setIsLoading(false);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    }
  };

  return { editMyProfile, isLoading, showSavedMessage };
};