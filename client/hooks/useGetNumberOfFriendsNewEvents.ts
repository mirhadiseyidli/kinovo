import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api';

export const useGetNumberOfFriendsNewEvents = () => {
  const fetchNumberOfFriendsNewEvents = async () => {
    try {
      const response = await api.get('/api/managefriends/user/get/number/friends/new/events');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch friends new events count:', error);
      Alert.alert('Error', 'Failed to fetch user data');
      throw error;
    }
  };

  return { fetchNumberOfFriendsNewEvents, refetchNumberOfFriendsNewEvents: fetchNumberOfFriendsNewEvents };
};