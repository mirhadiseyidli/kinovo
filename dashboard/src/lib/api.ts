import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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

// Extend AxiosRequestConfig to include _retry flag
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
  _startTime?: number;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.KINOVO_API_URL,
  timeout: 30000,
});

// Enhanced token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

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

// Enhanced logout function with proper cleanup
const handleLogout = async () => {
  try {
    // Reset refresh state
    isRefreshing = false;
    refreshPromise = null;
    
    // Reject all waiting requests
    waitingRequests.forEach(request => {
      request.reject(createTypedError('auth', 'User logged out', 401));
    });
    waitingRequests = [];
    
    // Clear stored tokens from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
    }
    
    // Redirect to login
    window.location.href = '/auth/signin';
  } catch (error) {
    console.error('Error during logout:', error);
    // Still redirect to login even if cleanup fails
    window.location.href = '/auth/signin';
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
    try {
      isRefreshing = true;
      
      const refreshToken = typeof window !== 'undefined' 
        ? localStorage.getItem('refreshToken') 
        : null;
        
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Set timeout for refresh request
      const refreshTimeout = setTimeout(() => {
        reject(createTypedError('auth', 'Token refresh timeout', 408));
      }, REFRESH_TIMEOUT);

      const response = await axios.post(`${process.env.KINOVO_API_URL}/api/auth/refresh-token`, {
        refreshToken,
      });

      clearTimeout(refreshTimeout);

      if (response.data?.accessToken) {
        const newAccessToken = response.data.accessToken;
        
        // Store new token
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
          
          // Store new refresh token if provided
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
        }
        
        resolve(newAccessToken);
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error: any) {
      const typedError = createTypedError(
        'auth',
        error?.response?.data?.message || error.message || 'Token refresh failed',
        error?.response?.status || 500,
        { originalError: error }
      );
      
      reject(typedError);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  });

  return refreshPromise;
};

// Request interceptor to add authorization header
api.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    // Add timing for request monitoring
    config._startTime = Date.now();
    
    // Add auth token if available and not already set
    if (typeof window !== 'undefined' && !config.headers.Authorization) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(
      createTypedError('network', 'Request setup failed', 500, { originalError: error })
    );
  }
);

// Response interceptor with enhanced error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log slow requests for monitoring
    const config = response.config as CustomAxiosRequestConfig;
    if (config._startTime) {
      const duration = Date.now() - config._startTime;
      if (duration > 5000) { // Log requests taking more than 5 seconds
        console.warn(`Slow API request: ${config.method?.toUpperCase()} ${config.url} took ${duration}ms`);
      }
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalConfig = error.config as CustomAxiosRequestConfig;
    
    // Handle network errors
    if (!error.response) {
      const networkError = createTypedError(
        'network',
        error.code === 'ECONNABORTED' ? 'Request timeout' : 'Network error',
        error.code === 'ECONNABORTED' ? 408 : 503,
        { code: error.code, originalError: error }
      );
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;

    // Handle 401 errors with token refresh
    if (status === 401 && originalConfig && !originalConfig._retry) {
      // Prevent infinite retry loops
      originalConfig._retry = true;
      originalConfig._retryCount = (originalConfig._retryCount || 0) + 1;

      if (originalConfig._retryCount > MAX_RETRY_COUNT) {
        await handleLogout();
        return Promise.reject(
          createTypedError('auth', 'Maximum retry attempts exceeded', 401)
        );
      }

      // Check if we have too many waiting requests
      if (waitingRequests.length >= MAX_WAITING_REQUESTS) {
        return Promise.reject(
          createTypedError('auth', 'Too many concurrent refresh attempts', 429)
        );
      }

      // If already refreshing, add to waiting queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitingRequests.push({
            resolve,
            reject,
            config: originalConfig,
            timestamp: Date.now()
          });
        });
      }

      try {
        const newAccessToken = await refreshAccessToken();
        
        // Process all waiting requests with new token
        processWaitingRequests(newAccessToken);
        
        // Retry original request with new token
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalConfig);
        
      } catch (refreshError) {
        // Token refresh failed, process waiting requests with error
        processWaitingRequests(null, refreshError);
        
        // Handle different refresh error scenarios
        const refreshTypedError = refreshError as TypedAxiosError;
        if (refreshTypedError.status === 403 || refreshTypedError.message.includes('refresh')) {
          await handleLogout();
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other HTTP errors
    let typedError: TypedAxiosError;
    
    if (status >= 500) {
      typedError = createTypedError('server', data?.message || 'Server error', status, { data });
    } else if (status === 403) {
      typedError = createTypedError('auth', data?.message || 'Access forbidden', status, { data });
    } else {
      typedError = createTypedError('network', data?.message || 'Request failed', status, { data });
    }

    return Promise.reject(typedError);
  }
);

// Export the configured axios instance and utility functions
export { api as default, handleLogout, createTypedError };
export type { TypedAxiosError, NetworkError, AuthError, ServerError };