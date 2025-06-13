import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import axios from 'axios';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import type { ApiError } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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
          const backendResponse = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/google-auth`, {
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
        } catch (error) {
          const err = error;
          if (axios.isAxiosError(err)) {
            if (err.response) {
              console.error('Backend error:', err.response.data);
              Alert.alert('Error', `Authentication failed: ${err.response.data.message || 'Unknown server error'}`);
            } else if (err.request) {
              console.error('Network error:', err.request);
              Alert.alert('Error', 'Network error. Please try again.');
            } else {
              console.error('Error:', err.message);
              Alert.alert('Error', err.message);
            }
          } else {
            console.error('Unknown error:', err);
            Alert.alert('Error', 'An unknown error occurred.');
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