import { useState } from 'react';
import { Alert } from 'react-native';
import { EditUserProfileParams } from '@/types/allTypes';
import api from '@/utils/api';

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
  facebookUsername,
  dateOfBirth
}: EditUserProfileParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  const editMyProfile = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    try {
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
        },
        date_of_birth: dateOfBirth
      };

      await api.patch('/api/users/user/edit/myprofile', updatedProfile);

    } catch (error: any) {
      console.error('Profile update failed:', error.response?.data?.message || error.message);
      Alert.alert('Error', 'Failed to update profile');
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