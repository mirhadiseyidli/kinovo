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

const GoogleOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  });

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const idToken = response.authentication.idToken;

      if (!idToken) {
        Alert.alert('Error', 'Failed to retrieve idToken');
        return;
      }

      const authenticate = async () => {
        try {
          const backendResponse = await api.post(`/api/auth/google-auth`, {
            idToken,
          });

          if (backendResponse.status === 200 && backendResponse.data.success) {
            const { accessToken, refreshToken, user, firebaseToken } = backendResponse.data;

            if (!accessToken || !refreshToken || !firebaseToken) {
              throw new Error('Invalid token response from backend');
            }

            onLoginSuccess(accessToken, refreshToken, user._id, firebaseToken);
          } else {
            Alert.alert('Error', 'Authentication failed.');
          }
        } catch (error: any) {
          console.error('Google Sign In error:', error);
          
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
    }
  }, [response]);

  return (
    <AuthButton onPress={() => promptAsync()} logo='google' disabled={!request} backgroundColor={themeColors.inputBackgroundColor} />
  );
};

export default GoogleOAuth;