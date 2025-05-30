import React, { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import api from '@/utils/api';

export const useUserData = () => {
  const fetchUserData = async () => {
    try {
      const response = await api.get('/api/users/me');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      Alert.alert('Error', 'Failed to fetch user data');
      throw error;
    }
  };

  return { fetchUserData, refetchUser: fetchUserData };
};