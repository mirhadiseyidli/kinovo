import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_SERVER_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const refreshResponse = await axios.post(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh`,
            { refreshToken }
          );
          
          const { accessToken } = refreshResponse.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } else {
          // No refresh token, logout
          await handleLogout();
        }
      } catch (refreshError) {
        // Refresh failed, logout
        console.error('Token refresh failed:', refreshError);
        await handleLogout();
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle logout
const handleLogout = async () => {
  try {
    await AsyncStorage.multiRemove(['accessToken', 'userId']);
    await SecureStore.deleteItemAsync('refreshToken');
    // Navigate to login screen
    router.replace('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

export default api; 