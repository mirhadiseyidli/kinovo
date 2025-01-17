import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } from '@react-native-google-signin/google-signin';
import { GOOGLE_CLIENT_ID_IOS } from '@env';
import axios from 'axios';
import AuthButton from './AuthButton';
const googleLogo = require('../assets/google-logo.png');

interface GoogleOAuthProps {
  onLoginSuccess: (idToken: string) => void; // Explicit type for the login success callback
}

const GoogleOAuth: React.FC<GoogleOAuthProps> = ({ onLoginSuccess }) => {
  // Configure Google Sign-In
  GoogleSignin.configure({
    iosClientId: GOOGLE_CLIENT_ID_IOS, // [iOS] Specify the iOS client ID
  });

  const googleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('Failed to retrieve idToken');
      }

      onLoginSuccess(idToken);
  
      // Send idToken to your backend
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/google`, {
        idToken, // Axios automatically converts objects to JSON and sets appropriate headers
      });
  
      console.log('Backend response:', response.data);
  
      if (response.status === 200) {
        Alert.alert('Success', 'User authenticated successfully!');
      } else {
        Alert.alert('Error', 'Authentication failed.');
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        // Axios-specific error
        if (error.response) {
          // Server responded with a status code out of 2xx range
          console.error('Backend error:', error.response.data);
          Alert.alert('Error', `Authentication failed: ${error.response.data.message || 'Unknown server error'}`);
        } else if (error.request) {
          // Request made but no response received
          console.error('Network error:', error.request);
          Alert.alert('Error', 'Network error. Please try again.');
        } else {
          // Something happened in setting up the request
          console.error('Error:', error.message);
          Alert.alert('Error', error.message);
        }
      } else {
        // Non-Axios error
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