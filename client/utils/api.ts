import axios, { AxiosError, InternalAxiosRequestConfig, CancelToken } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Typed error interfaces for better error handling
interface ApiError {
  message: string;
  status: number;
  code?: string;
  data?: any;
  timestamp: number;
}

interface NetworkError extends ApiError {
  type: 'network';
  isTimeout: boolean;
  isAborted: boolean;
}

interface AuthError extends ApiError {
  type: 'auth';
  isTokenExpired: boolean;
  isRefreshTokenInvalid: boolean;
}

interface ServerError extends ApiError {
  type: 'server';
  details?: any;
}

type TypedAxiosError = NetworkError | AuthError | ServerError;

// Extend AxiosRequestConfig to include _retry flag and abort controller
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
  _startTime?: number;
  _abortController?: AbortController;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_SERVER_BASE_URL,
  timeout: 30000,
});

// Enhanced token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

// Store of waiting requests with proper typing and memory management
let waitingRequests: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
  config: CustomAxiosRequestConfig;
  timestamp: number;
}> = [];

// Constants for timeout and retry management
const REFRESH_TIMEOUT = 10000; // 10 seconds
const MAX_WAITING_REQUESTS = 50; // Prevent memory overflow
const WAITING_REQUEST_TTL = 30000; // 30 seconds max wait time
const MAX_RETRY_COUNT = 3;

// Enhanced waiting request management with memory leak prevention
const processWaitingRequests = (token: string | null, error: any = null) => {
  const now = Date.now();
  
  // Filter out expired requests to prevent memory leaks
  const validRequests = waitingRequests.filter(request => {
    const isExpired = now - request.timestamp > WAITING_REQUEST_TTL;
    if (isExpired) {
      request.reject(createTypedError('auth', 'Request timeout during token refresh', 408));
    }
    return !isExpired;
  });

  // Process valid requests
  validRequests.forEach(request => {
    if (error) {
      request.reject(error);
    } else if (token) {
      request.config.headers.Authorization = `Bearer ${token}`;
      request.resolve(api(request.config));
    }
  });
  
  // Clear the waiting requests array
  waitingRequests = [];
};

// Helper function to create typed errors
const createTypedError = (
  type: 'network' | 'auth' | 'server',
  message: string,
  status: number,
  additionalData?: any
): TypedAxiosError => {
  const baseError: ApiError = {
    message,
    status,
    timestamp: Date.now(),
    ...additionalData,
  };

  switch (type) {
    case 'network':
      return {
        ...baseError,
        type: 'network',
        isTimeout: status === 408,
        isAborted: status === 499,
      } as NetworkError;
    
    case 'auth':
      return {
        ...baseError,
        type: 'auth',
        isTokenExpired: status === 401,
        isRefreshTokenInvalid: status === 403,
      } as AuthError;
    
    case 'server':
      return {
        ...baseError,
        type: 'server',
        details: additionalData,
      } as ServerError;
    
    default:
      return baseError as TypedAxiosError;
  }
};

// Clean up expired waiting requests periodically
const cleanupExpiredRequests = () => {
  const now = Date.now();
  const initialLength = waitingRequests.length;
  
  waitingRequests = waitingRequests.filter(request => {
    const isExpired = now - request.timestamp > WAITING_REQUEST_TTL;
    if (isExpired) {
      request.reject(createTypedError('auth', 'Request timeout during token refresh', 408));
    }
    return !isExpired;
  });
  
  // Log cleanup if requests were removed
  if (initialLength > waitingRequests.length) {
    console.warn(`Cleaned up ${initialLength - waitingRequests.length} expired waiting requests`);
  }
};

// Enhanced logout function with proper cleanup
const handleLogout = async () => {
  try {
    // Reset refresh state
    isRefreshing = false;
    refreshPromise = null;
    
    // Clear refresh timeout
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
      refreshTimeout = null;
    }
    
    // Reject all waiting requests
    waitingRequests.forEach(request => {
      request.reject(createTypedError('auth', 'User logged out', 401));
    });
    waitingRequests = [];
    
    // Clear stored tokens
    await Promise.all([
      SecureStore.deleteItemAsync('accessToken').catch(() => {}),
      AsyncStorage.removeItem('userId').catch(() => {}),
      SecureStore.deleteItemAsync('refreshToken').catch(() => {})
    ]);
    
    // Navigate to login screen
    router.replace('/login');
  } catch (error) {
    console.error('Error during logout:', error);
    // Still navigate to login even if cleanup fails
    router.replace('/login');
  }
};

// Enhanced refresh token function with race condition protection
const refreshAccessToken = async (): Promise<string> => {
  // Return existing refresh promise if already in progress
  if (refreshPromise) {
    return refreshPromise;
  }

  // Create new refresh promise
  refreshPromise = new Promise<string>(async (resolve, reject) => {
    const abortController = new AbortController();
    
    // Set timeout to abort the request
    refreshTimeout = setTimeout(() => {
      abortController.abort();
      reject(createTypedError('network', 'Token refresh timeout', 408));
    }, REFRESH_TIMEOUT);

    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) {
        throw createTypedError('auth', 'No refresh token available', 401);
      }

      // Make refresh request with abort controller
      const response = await axios({
        method: 'post',
        url: `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`,
        headers: {
          Authorization: `Bearer ${refreshToken}`
        },
        timeout: REFRESH_TIMEOUT,
        signal: abortController.signal
      });
      
      if (!response.data?.accessToken) {
        throw createTypedError('auth', 'Invalid refresh token response', 401);
      }

      const newAccessToken = response.data.accessToken;
      await SecureStore.setItemAsync('accessToken', newAccessToken);
      
      // Clear timeout on success
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
      
      resolve(newAccessToken);
    } catch (error: any) {
      // Clear timeout on error
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }

      // Handle different error types
      if (error.name === 'AbortError') {
        reject(createTypedError('network', 'Token refresh aborted', 499));
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || 'Token refresh failed';
        
        if (status === 403) {
          reject(createTypedError('auth', 'Refresh token invalid', 403));
        } else if (status === 401) {
          reject(createTypedError('auth', 'Refresh token expired', 401));
        } else {
          reject(createTypedError('server', message, status, error.response.data));
        }
      } else if (error.request) {
        // Network error
        reject(createTypedError('network', 'Network error during token refresh', 503));
      } else {
        // Other errors
        reject(createTypedError('network', error.message || 'Unknown error', 500));
      }
    }
  });

  // Clear the promise when it completes (success or failure)
  refreshPromise
    .catch(() => {}) // Ignore errors here, they're handled above
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

// Enhanced request interceptor with abort controller and telemetry
api.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // Initialize request tracking
    config._startTime = Date.now();
    config._retryCount = config._retryCount || 0;
    
    // Create abort controller for request cancellation
    if (!config._abortController) {
      config._abortController = new AbortController();
      config.signal = config._abortController.signal;
    }
    
    // Don't add token for refresh token requests
    if (config.url?.includes('/api/auth/refresh-token')) {
      return config;
    }

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add telemetry breadcrumb (if Sentry is available)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.addBreadcrumb({
          category: 'http',
          message: `${config.method?.toUpperCase()} ${config.url}`,
          level: 'info',
          data: {
            url: config.url,
            method: config.method,
            retryCount: config._retryCount,
          },
        });
      }
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(createTypedError('network', 'Request setup failed', 500));
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(createTypedError('network', 'Request interceptor failed', 500));
  }
);

// Enhanced response interceptor with better error handling and memory management
api.interceptors.response.use(
  (response) => {
    // Add telemetry for successful responses
    const config = response.config as CustomAxiosRequestConfig;
    if (config._startTime) {
      const duration = Date.now() - config._startTime;
      
      // Add Sentry breadcrumb for response timing
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.addBreadcrumb({
          category: 'http',
          message: `${config.method?.toUpperCase()} ${config.url} - ${response.status}`,
          level: 'info',
          data: {
            url: config.url,
            method: config.method,
            status: response.status,
            duration,
            retryCount: config._retryCount,
          },
        });
      }
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    
    if (!originalRequest) {
      return Promise.reject(createTypedError('network', 'Invalid request configuration', 500));
    }

    // Calculate request duration for telemetry
    const duration = originalRequest._startTime ? Date.now() - originalRequest._startTime : 0;
    
    // Add telemetry breadcrumb for errors
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        category: 'http',
        message: `${originalRequest.method?.toUpperCase()} ${originalRequest.url} - ${error.response?.status || 'Network Error'}`,
        level: 'error',
        data: {
          url: originalRequest.url,
          method: originalRequest.method,
          status: error.response?.status,
          duration,
          retryCount: originalRequest._retryCount,
          errorMessage: error.message,
        },
      });
    }

    // Don't retry certain request types
    const skipRetryUrls = [
      '/api/auth/refresh-token',
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/verify-login',
      '/api/auth/get-phone',
      '/api/users/user/bypass-two-factor-auth'
    ];
    
    if (skipRetryUrls.some(url => originalRequest.url?.includes(url))) {
      return Promise.reject(error);
    }

    // Get status code safely
    const statusCode = error.response?.status;
    
    // Check for auth-related errors
    const responseData = error.response?.data as any;
    const errorMessage = responseData?.message;
    const isTokenExpiredError = statusCode === 401 || 
                        (errorMessage && 
                         typeof errorMessage === 'string' && 
                         (errorMessage.includes('token') || 
                          errorMessage.includes('unauthorized') || 
                          errorMessage.includes('Unauthorized')));
    
    // If we have a 403 error, refresh token is invalid
    if (statusCode === 403) {
      await handleLogout();
      return Promise.reject(createTypedError('auth', 'Refresh token invalid', 403));
    }

    // Prevent infinite retry loops
    if (originalRequest._retryCount && originalRequest._retryCount >= MAX_RETRY_COUNT) {
      console.warn(`Max retry count reached for ${originalRequest.url}`);
      return Promise.reject(createTypedError('network', 'Max retry count exceeded', 429));
    }

    // Handle token refresh logic
    if (isTokenExpiredError && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      // Check if we have too many waiting requests (prevent memory overflow)
      if (waitingRequests.length >= MAX_WAITING_REQUESTS) {
        console.warn('Too many waiting requests, rejecting new request');
        return Promise.reject(createTypedError('network', 'Too many concurrent requests', 429));
      }

      // Clean up expired requests periodically
      if (waitingRequests.length > 0) {
        cleanupExpiredRequests();
      }

      // If we're already refreshing, add this request to the waiting list
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitingRequests.push({
            resolve,
            reject,
            config: originalRequest,
            timestamp: Date.now(),
          });
        });
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
      } catch (refreshError: any) {
        // Process waiting requests with error
        processWaitingRequests(null, refreshError);
        
        // Only logout if refresh token is expired (403) or explicitly invalid
        // For other errors (network issues, timeouts, etc.), keep user logged in
        if (refreshError?.status === 403 || refreshError?.isRefreshTokenInvalid) {
          // Refresh token is invalid/expired, must logout
          await handleLogout();
        } else {
          // For other errors, just reject without logging out
          // This allows the app to retry later when conditions improve
          console.warn('Token refresh failed but keeping user logged in:', refreshError?.message);
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Create typed error for better error handling
    if (error.response) {
      const typedError = createTypedError('server', errorMessage || 'Server error', statusCode || 500, responseData);
      return Promise.reject(typedError);
    } else if (error.request) {
      const typedError = createTypedError('network', 'Network error', 503);
      return Promise.reject(typedError);
    } else {
      const typedError = createTypedError('network', error.message || 'Unknown error', 500);
      return Promise.reject(typedError);
    }
  }
);

// Periodic cleanup to prevent memory leaks
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

// Start cleanup interval
const startCleanup = () => {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    if (waitingRequests.length > 0) {
      cleanupExpiredRequests();
    }
  }, 30000); // Clean up every 30 seconds
};

// Stop cleanup interval
const stopCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Start cleanup when module loads
startCleanup();

// Export cleanup functions for testing or manual control
export { startCleanup, stopCleanup, cleanupExpiredRequests };

// Export typed error types for better error handling in components
export type { 
  TypedAxiosError, 
  ApiError, 
  NetworkError, 
  AuthError, 
  ServerError 
};

export default api; 