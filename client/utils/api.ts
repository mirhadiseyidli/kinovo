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
  timeout: 30000,
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

// Helper function to handle logout
const handleLogout = async () => {
  try {
    isRefreshing = false; // Reset the flag
    waitingRequests = []; // Clear any waiting requests
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

// Helper function to refresh token
const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Try the call with a timeout to catch network issues
    try {
      const response = await axios({
        method: 'post',
        url: `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`,
        headers: {
          Authorization: `Bearer ${refreshToken}`
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (!response.data.accessToken) {
        throw new Error('Invalid refresh token response');
      }

      const newAccessToken = response.data.accessToken;
      await SecureStore.setItemAsync('accessToken', newAccessToken);
      return newAccessToken;
    } catch (requestError: any) {
      if (requestError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log('Error response status:', requestError.response.status);
        console.log('Error response data:', JSON.stringify(requestError.response.data));
      } else if (requestError.request) {
        // The request was made but no response was received
        console.log('No response received');
      } else {
        // Something happened in setting up the request
        console.log('Error message:', requestError.message);
      }
      throw requestError;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Don't add token for refresh token requests
    if (config.url?.includes('/api/auth/refresh-token')) {
      return config;
    }

    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Check if we have a response object
    if (error.response) {
    } else {
    }
    
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Don't retry refresh token requests or login requests
    if (originalRequest.url?.includes('/api/auth/refresh-token') || 
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/signup') ||
        originalRequest.url?.includes('/api/auth/verify-login') ||
        originalRequest.url?.includes('/api/auth/get-phone') ||
        originalRequest.url?.includes('/api/users/user/bypass-two-factor-auth')) {
      return Promise.reject(error);
    }

    // Get status code safely
    const statusCode = error.response?.status;
    
    // Check for auth-related errors in the response
    const responseData = error.response?.data as any;
    const errorMessage = responseData?.message;
    const isTokenExpiredError = statusCode === 401 || 
                        (errorMessage && 
                         typeof errorMessage === 'string' && 
                         (errorMessage.includes('token') || 
                          errorMessage.includes('unauthorized') || 
                          errorMessage.includes('Unauthorized')));
    
    // If we have a 403 error, it means refresh token is invalid
    if (statusCode === 403) {
      await handleLogout();
      return Promise.reject(error);
    }

    // If error is 401 or token expired and we haven't retried yet
    if (isTokenExpiredError && !originalRequest._retry) {
      originalRequest._retry = true;

      // If we're already refreshing, add this request to the waiting list
      if (isRefreshing) {
        try {
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
        const newAccessToken = await refreshAccessToken();
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        // Process any requests that were waiting
        processWaitingRequests(newAccessToken);
        
        // Return the original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        // Process waiting requests with error
        processWaitingRequests(null, refreshError);
        
        // Clear tokens and redirect to login
        await handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    } else if (statusCode === 401) {
      console.log('Got 401 but _retry is true, not attempting refresh');
    } else {
      console.log('Error is not 401 or request already retried');
    }
    
    return Promise.reject(error);
  }
);

export default api; 