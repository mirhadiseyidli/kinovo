import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import type { ApiError } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import api from '@/utils/api';

const googleLogo = require('@/assets/google-logo.png');

const GoogleOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess, onLoginStart, onLoginError }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  });

  React.useEffect(() => {
    if (!response) return;

    if (response.type === 'success' && response.authentication) {
      const idToken = response.authentication.idToken;

      if (!idToken) {
        Alert.alert('Error', 'Failed to retrieve idToken');
        onLoginError?.();
        return;
      }

      const authenticate = async () => {
        try {
          const backendResponse = await api.post(`/api/auth/google-auth`, {
            idToken,
          });

          if (backendResponse.status === 200 && backendResponse.data.success) {
            const { accessToken, refreshToken, user } = backendResponse.data;

            if (!accessToken || !refreshToken) {
              throw new Error('Invalid token response from backend');
            }

            onLoginSuccess(accessToken, refreshToken, user._id);
          } else {
            Alert.alert('Error', 'Authentication failed.');
          }
        } catch (error: any) {
          console.error('Google Sign In error:', error);
          onLoginError?.();
          
          if (error.response) {
            console.error('Backend error:', error.response.data);
            Alert.alert('Error', `Authentication failed: ${error.response.data.message || 'Unknown server error'}`);
          } else if (error.request) {
            console.error('Network error:', error.request);
            Alert.alert('Error', 'Network error. Please try again.');
          } else {
            console.error('Error:', error.message);
            Alert.alert('Error', error.message);
          }
        }
      };

      authenticate();
    } else {
      // Any non-success response (cancel, dismiss, error) should clear loading state in parent
      onLoginError?.();
    }
  }, [response]);

  const handleGoogleSignIn = () => {
    onLoginStart?.();
    promptAsync();
  };

  return (
    <AuthButton onPress={handleGoogleSignIn} logo='google' disabled={!request} backgroundColor={colorScheme === 'dark' ? '#333333' : '#DEDDD0'} oauth_type='Google'/>
  );
};

export default GoogleOAuth;