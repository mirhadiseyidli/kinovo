import React from 'react';
import { Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import AuthButton from '@/components/Auth/AuthButton';
import { AuthLoginProps } from '@/types/allTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import api from '@/utils/api';

const AppleOAuth: React.FC<AuthLoginProps> = ({ onLoginSuccess, onLoginStart, onLoginError }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = React.useState(false);

  React.useEffect(() => {
    // Check if Apple authentication is available
    AppleAuthentication.isAvailableAsync().then(isAvailable => {
      setIsAppleAuthAvailable(isAvailable);
    });
  }, []);

  const appleSignIn = async () => {
    onLoginStart?.();
    try {
      if (Platform.OS !== 'ios') {
        Alert.alert('Not Available', 'Apple Sign In is only available on iOS devices.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple authentication successful
      const { identityToken, fullName, email, user: appleUser, realUserStatus, state } = credential;

      if (!identityToken) {
        console.error('No identity token received from Apple');
        Alert.alert('Error', 'Failed to retrieve identity token');
        return;
      }

      const backendResponse = await api.post(
        `/api/auth/apple-auth`,
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

      
      if (backendResponse.status === 200 && backendResponse.data.success) {
        const { accessToken, refreshToken, user } = backendResponse.data;

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in response');
          throw new Error('Invalid token response from backend');
        }

        onLoginSuccess(accessToken, refreshToken, user._id);
      } else {
        console.error('Authentication failed with status:', backendResponse.status);
        Alert.alert('Error', 'Authentication failed.');
      }
    } catch (error: any) {
      // Handle Apple authentication errors
      if (error.code === 'ERR_CANCELED') {
        // User canceled the sign-in
        onLoginError?.();
        return;
      }

      console.error('Apple Sign In error:', error);
      onLoginError?.();

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
    }
  };

  // Don't render the button if Apple authentication is not available
  if (!isAppleAuthAvailable && Platform.OS === 'ios') {
    return null;
  }

  return (
    <AuthButton 
      onPress={appleSignIn} 
      logo='apple' 
      backgroundColor={colorScheme === 'dark' ? '#333333' : '#DEDDD0'} 
      oauth_type='Apple'
    />
  );
};

export default AppleOAuth;