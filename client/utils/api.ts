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

console.log('API utility initialized with interceptors');

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
  console.log('--------------------------------');
  console.log('Refreshing access token');
  console.log('--------------------------------');
  try {
    console.log('--------------------------------');
    console.log('Getting refresh token');
    console.log('--------------------------------');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      console.log('No refresh token found in secure storage');
      throw new Error('No refresh token available');
    }
    console.log('--------------------------------');
    console.log('Refresh token found:', refreshToken.substring(0, 10) + '...');
    console.log('--------------------------------');

    console.log('Sending refresh token request to:', `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`);
    
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
      
      console.log('Refresh token response received:', response.status);
      console.log('Response data:', JSON.stringify(response.data));

      if (!response.data.accessToken) {
        console.log('No access token in response');
        throw new Error('Invalid refresh token response');
      }

      const newAccessToken = response.data.accessToken;
      console.log('New access token received:', newAccessToken.substring(0, 10) + '...');
      await SecureStore.setItemAsync('accessToken', newAccessToken);
      return newAccessToken;
    } catch (requestError: any) {
      console.log('Request error details:');
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
    console.log('--------------------------------');
    console.log('API Error Interceptor triggered');
    
    // Check if we have a response object
    if (error.response) {
      console.log('Error status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data));
    } else {
      console.log('No response from server');
      console.log('Error message:', error.message);
    }
    
    console.log('URL:', error.config?.url);
    console.log('--------------------------------');
    
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    if (!originalRequest) {
      console.log('No original request found');
      return Promise.reject(error);
    }

    // Don't retry refresh token requests
    if (originalRequest.url?.includes('/api/auth/refresh-token')) {
      console.log('Not retrying refresh token request');
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
    
    console.log('Is token expired error:', isTokenExpiredError);
    
    // If we have a 403 error, it means refresh token is invalid
    if (statusCode === 403) {
      console.log('Got 403 error, logging out (invalid refresh token)');
      await handleLogout();
      return Promise.reject(error);
    }

    // If error is 401 or token expired and we haven't retried yet
    if (isTokenExpiredError && !originalRequest._retry) {
      console.log('Got token expired error, attempting to refresh token');
      originalRequest._retry = true;

      // If we're already refreshing, add this request to the waiting list
      if (isRefreshing) {
        console.log('Token refresh already in progress, adding request to queue');
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
      console.log('Starting token refresh process');

      try {
        const newAccessToken = await refreshAccessToken();
        console.log('Token refresh successful');
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        // Process any requests that were waiting
        processWaitingRequests(newAccessToken);
        
        // Return the original request with new token
        return api(originalRequest);
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
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