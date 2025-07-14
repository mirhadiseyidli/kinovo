import { useState, useRef, useEffect } from 'react';
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    };
  }, []);

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
        await new Promise(resolve => {
          delayTimeoutRef.current = setTimeout(resolve, 1000 - elapsed) as ReturnType<typeof setTimeout>;
        });
      }
      if (mountedRef.current) {
        setIsLoading(false);
        setShowSavedMessage(true);
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setShowSavedMessage(false);
          }
        }, 2000) as ReturnType<typeof setTimeout>;
      }
    }
  };

  return { editMyProfile, isLoading, showSavedMessage };
};