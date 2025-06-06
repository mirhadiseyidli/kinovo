import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Extend AxiosRequestConfig to include _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_SERVER_BASE_URL,
  timeout: 10000,
});

// Flag to track if we're currently refreshing the token
let isRefreshing = false;
// Store of waiting requests
let waitingRequests: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
  config: CustomAxiosRequestConfig;
}> = [];

// Process waiting requests with new token
const processWaitingRequests = (token: string | null, error: any = null) => {
  waitingRequests.forEach(request => {
    if (error) {
      request.reject(error);
    } else if (token) {
      request.config.headers.Authorization = `Bearer ${token}`;
      request.resolve(api(request.config));
    }
  });
  waitingRequests = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
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
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If we're already refreshing, add this request to the waiting list
      if (isRefreshing) {
        try {
          // Wait for the token refresh to complete
          return new Promise((resolve, reject) => {
            waitingRequests.push({
              resolve,
              reject,
              config: originalRequest,
            });
          });
        } catch (err) {
          return Promise.reject(err);
        }
      }

      isRefreshing = true;

      try {
        // Try to refresh the token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post(
          `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh`,
          { refreshToken }
        );
        
        const { accessToken } = refreshResponse.data;
        await SecureStore.setItemAsync('accessToken', accessToken);
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Process any requests that were waiting
        processWaitingRequests(accessToken);
        
        // Return the original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        // Process waiting requests with error
        processWaitingRequests(null, refreshError);
        
        // Refresh failed, logout
        console.error('Token refresh failed:', refreshError);
        await handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle logout
const handleLogout = async () => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken'),
      AsyncStorage.removeItem('userId'),
      SecureStore.deleteItemAsync('refreshToken')
    ]);
    // Navigate to login screen
    router.replace('/login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

export default api; 