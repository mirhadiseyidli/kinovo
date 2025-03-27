import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import type { ApiError } from '@/types/allTypes';

const googleLogo = require('@/assets/google-logo.png');


const GoogleOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess }) => {
  // Configure Google Sign-In
  GoogleSignin.configure({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS, // [iOS] Specify the iOS client ID
  });

  const googleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.type === 'cancelled') {
        console.log('User cancelled the login');
        return; // Early return, no further action required
      }

      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('Failed to retrieve idToken');
      }

      // Send idToken to backend for authentication
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/google`, {
        idToken,
      });

      console.log('Backend response:', response.data);

      if (response.status === 200 && response.data.success) {
        const { accessToken, refreshToken } = response.data;

        if (!accessToken || !refreshToken) {
          throw new Error('Invalid token response from backend');
        }

        // Pass both tokens to onLoginSuccess
        onLoginSuccess(accessToken, refreshToken);
      } else {
        Alert.alert('Error', 'Authentication failed.');
      }
    } catch (error) {
      const err = error as ApiError;

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

  return (
    <AuthButton onPress={googleSignIn} logo={googleLogo} />
  );
};

export default GoogleOAuth;