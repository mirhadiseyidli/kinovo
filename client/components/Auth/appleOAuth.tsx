import React from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import axios from 'axios';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const AppleOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);

  React.useEffect(() => {
    // Check if Apple authentication is available
    AppleAuthentication.isAvailableAsync().then(isAvailable => {
      setIsAppleAuthAvailable(isAvailable);
      console.log('Apple authentication available:', isAvailable);
    });
  }, []);

  const appleSignIn = async () => {
    try {
      if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Sign In is only available on iOS devices.');
        return;
      }

      console.log('Starting Apple Sign In...');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple authentication successful
      console.log('Apple Sign In successful');
      const { identityToken, fullName, email, user: appleUser, realUserStatus, state } = credential;
      console.log('Apple Sign In successful', fullName, email, appleUser, realUserStatus, state);

      if (!identityToken) {
        console.error('No identity token received from Apple');
        Alert.alert('Error', 'Failed to retrieve identity token');
        return;
      }

      console.log('Got identity token, length:', identityToken.length);
      console.log('Email received:', email || 'No email');
      console.log('Full name received:', fullName ? `${fullName.givenName} ${fullName.familyName}` : 'No name');

      // Send the token to your backend
      console.log('Sending request to backend...');
      const backendResponse = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/apple-auth`,
        {
          identityToken,
          user: {
            email,
            fullName: {
              givenName: fullName?.givenName,
              familyName: fullName?.familyName,
            },
            appleUser,
          },
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      console.log('Backend response status:', backendResponse.data);
      
      if (backendResponse.status === 200 && backendResponse.data.success) {
        console.log('Authentication successful, processing tokens...');
        const { accessToken, refreshToken, user, firebaseToken } = backendResponse.data;

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in response');
          throw new Error('Invalid token response from backend');
        }

        console.log('Calling onLoginSuccess with tokens');
        onLoginSuccess(accessToken, refreshToken, user._id, firebaseToken);
      } else {
        console.error('Authentication failed with status:', backendResponse.status);
        Alert.alert('Error', 'Authentication failed.');
      }
    } catch (error: any) {
      // Handle Apple authentication errors
      if (error.code === 'ERR_CANCELED') {
        // User canceled the sign-in
        console.log('User canceled Apple Sign In');
        return;
      }

      console.error('Apple Sign In error:', error);

      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Backend error:', error.response.data);
          console.error('Status:', error.response.status);
          Alert.alert('Error', `Authentication failed: ${error.response.data.message || 'Unknown server error'}`);
        } else if (error.request) {
          console.error('Network error - no response received');
          Alert.alert('Error', 'Network error. Please try again.');
        } else {
          console.error('Error setting up request:', error.message);
          Alert.alert('Error', error.message);
        }
      } else {
        console.error('Unknown error type:', error);
        Alert.alert('Error', 'An unknown error occurred.');
      }
    }
  };

  // Don't render the button if Apple authentication is not available
  if (!isAppleAuthAvailable && Platform.OS === 'ios') {
    console.log('Not rendering Apple button because auth is not available');
    return null;
  }

  return (
    <AuthButton 
      onPress={appleSignIn} 
      logo='apple' 
      backgroundColor={themeColors.inputBackgroundColor} 
    />
  );
};

export default AppleOAuth;