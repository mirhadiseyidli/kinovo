import React from 'react';
import { View, Button, Alert, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// const facebookLogo = require('@/assets/facebook-logo.png');

const FacebookOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  // Configure Google Sign-In
  // GoogleSignin.configure({
  //   iosClientId: GOOGLE_CLIENT_ID_IOS, // [iOS] Specify the iOS client ID
  // });

  const facebookSignIn = async () => {}
  //   try {
  //     await GoogleSignin.hasPlayServices();
  //     const userInfo = await GoogleSignin.signIn();
  //     const idToken = userInfo.data?.idToken;
  //     if (!idToken) {
  //       throw new Error('Failed to retrieve idToken');
  //     }

  //     onLoginSuccess(idToken);
  
  //     // Send idToken to your backend
  //     const response = await axios.post('http://192.168.1.226:5002/api/auth/google', {
  //       idToken, // Axios automatically converts objects to JSON and sets appropriate headers
  //     });
  
  //     console.log('Backend response:', response.data);
  
  //     if (response.status === 200) {
  //       Alert.alert('Success', 'User authenticated successfully!');
  //     } else {
  //       Alert.alert('Error', 'Authentication failed.');
  //     }
  //   } catch (error: unknown) {
  //     if (axios.isAxiosError(error)) {
  //       // Axios-specific error
  //       if (error.response) {
  //         // Server responded with a status code out of 2xx range
  //         console.error('Backend error:', error.response.data);
  //         Alert.alert('Error', `Authentication failed: ${error.response.data.message || 'Unknown server error'}`);
  //       } else if (error.request) {
  //         // Request made but no response received
  //         console.error('Network error:', error.request);
  //         Alert.alert('Error', 'Network error. Please try again.');
  //       } else {
  //         // Something happened in setting up the request
  //         console.error('Error:', error.message);
  //         Alert.alert('Error', error.message);
  //       }
  //     } else {
  //       // Non-Axios error
  //       console.error('Unknown error:', error);
  //       Alert.alert('Error', 'An unknown error occurred.');
  //     }
  //   }
  // };

  return (
    <AuthButton onPress={facebookSignIn} logo='facebook' backgroundColor={themeColors.inputBackgroundColor} />
  );
};

export default FacebookOAuth;