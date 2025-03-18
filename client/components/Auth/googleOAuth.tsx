import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import AuthButton from '@/components/Auth/AuthButton';
const googleLogo = require('@/assets/google-logo.png');

interface GoogleOAuthProps {
  onLoginSuccess: (accessToken: string, refreshToken: string) => void; // Explicit type for the login success callback
}

const GoogleOAuth: React.FC<GoogleOAuthProps> = ({ onLoginSuccess }) => {
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
        Alert.alert('Success', 'User authenticated successfully!');
      } else {
        Alert.alert('Error', 'Authentication failed.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
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
      } else {
        console.error('Unknown error:', error);
        Alert.alert('Error', 'An unknown error occurred.');
      }
    }
  };

  return (
    <AuthButton onPress={googleSignIn} logo={googleLogo} />
  );
};

export default GoogleOAuth;