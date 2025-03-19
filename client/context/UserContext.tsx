import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

interface User {
  profile_picture: string;
  coverPhoto?: string;
  first_name: string;
  last_name: string;
  email: string;
  location?: {
    city: string;
    state: string;
  };
  bio?: string;
  friends: string[];
  events: string[];
  favorite_activities?: string[];
}

interface UserContextProps {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    refreshUserData();
  }, []);

  const refreshUserData = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setUser(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
      }
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await AsyncStorage.setItem('accessToken', accessToken);

      await refreshUserData();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};