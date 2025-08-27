import * as SecureStore from 'expo-secure-store';
import { fetch } from 'expo/fetch';
import { router } from 'expo-router';

// Custom fetch with token refresh logic
export const createAuthFetch = () => {
    return async (url: string, options: RequestInit = {}) => {
      // Get current token
      let token = await SecureStore.getItemAsync('accessToken');
      
      // Add token to headers
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      // Make initial request
      const { body, signal, ...restOptions } = options;
      let response = await fetch(url, {
        ...restOptions,
        headers,
        body: body || undefined,
        signal: signal || undefined,
      });
      
      // If token expired, try to refresh
      if (response.status === 401) {
        try {
          console.log('🔄 Token expired, refreshing...');
          
          // Get refresh token
          const refreshToken = await SecureStore.getItemAsync('refreshToken');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }
          
          // Refresh access token
          const refreshResponse = await fetch(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!refreshResponse.ok) {
            // Only logout if refresh token is expired (403)
            if (refreshResponse.status === 403) {
              console.error('❌ Refresh token expired, logging out');
              router.replace('/login');
              throw new Error('Refresh token expired');
            }
            // For other errors, just throw without logging out
            throw new Error(`Token refresh failed with status ${refreshResponse.status}`);
          }
          
          const refreshData = await refreshResponse.json();
          const newToken = refreshData.accessToken;
          
          // Store new token
          await SecureStore.setItemAsync('accessToken', newToken);
          
          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(url, {
            ...restOptions,
            headers,
            body: body || undefined,
            signal: signal || undefined,
          });
          
          console.log('✅ Token refreshed and request retried');
          
        } catch (error: any) {
          console.error('❌ Token refresh error:', error);
          // Only redirect to login if we explicitly logged out above (403 error)
          // For other errors (network, timeout, etc.), don't logout
          if (error?.message === 'Refresh token expired') {
            throw error; // Already handled logout above
          }
          // For other errors, just log and continue without logging out
          console.warn('Token refresh failed but keeping user logged in:', error?.message);
          throw error;
        }
      }
      
      return response;
    };
  };