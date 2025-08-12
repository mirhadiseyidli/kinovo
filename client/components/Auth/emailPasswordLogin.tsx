import React, { useState, useEffect } from 'react';
import { Text, Alert, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { AuthLoginProps, ApiError, EmailLoginProps } from '@/types/allTypes';
import AnimatedCheckBox from '../AnimatedCheckBox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '@/utils/api';
import { useAuthSession } from './AuthProvider';

const REMEMBERED_EMAIL_KEY = '@kinovo_remembered_email';

const EmailLogin: React.FC<EmailLoginProps> = ({ onLoginSuccess, onLoginStart, onLoginError }) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isChecked, setIsChecked] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuthSession();

  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setIsChecked(true);
      }
    } catch (error) {
      console.error('Error loading remembered email:', error);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' }));
  };

  const handleAuth = async () => {
    setTouched({ email: true, password: true });
    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Invalid email address');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    onLoginStart?.();
    try {
      // First verify credentials with login endpoint
      const loginResponse = await api.post('/api/auth/login', {
        email,
        password
      });

      if (!loginResponse.data.success) {
        throw new Error(loginResponse.data.message || 'Invalid email or password');
      }

      // Check if account is marked for deletion
      if (loginResponse.data.isMarkedForDeletion) {
        // Show confirmation dialog
        Alert.alert(
          'Account Deactivated',
          'This account was deactivated. Would you like to reactivate it?',
          [
            {
              text: 'No',
              style: 'cancel',
              onPress: () => {
                setLoading(false);
                onLoginError?.();
                // Clear password field
                setPassword('');
              }
            },
            {
              text: 'Yes, Reactivate',
              style: 'default',
              onPress: async () => {
                try {
                  // Call reactivate endpoint
                  await api.post('/api/auth/reactivate-account', {
                    email
                  });
                  
                  // Proceed with getting phone number and 2FA
                  const phoneResponse = await api.post('/api/auth/get-phone', {
                    email
                  });
                  
                  // Save email if remember me is checked
                  if (isChecked) {
                    await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
                  } else {
                    await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
                  }

                  // Bypass two-factor authentication
                  const shouldBypass = await api.get('/api/users/user/bypass-two-factor-auth', {
                    params: {
                      email
                    }
                  });
                  
                  if (!shouldBypass.data.bypass_two_factor_auth) {
                      // Navigate to 2FA screen
                    router.push({
                      pathname: '/login/two-factor',
                      params: {
                        email,
                        phoneNumber: phoneResponse.data.phoneNumber,
                        verifiedCredentials: 'true'
                      }
                    });
                  }
                } catch (error: any) {
                  const errorMessage = error.response?.data?.message || error.message || 'Failed to reactivate account';
                  Alert.alert('Error', errorMessage);
                } finally {
                  setLoading(false);
                }
              }
            }
          ]
        );
        return;
      }

      // If account is not marked for deletion, proceed with normal flow
      const phoneResponse = await api.post('/api/auth/get-phone', {
        email
      });
      
      // Save email if remember me is checked
      if (isChecked) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // Bypass two-factor authentication
      const shouldBypass = await api.get('/api/users/user/bypass-two-factor-auth', {
        params: {
          email: email
        }
      });

      if (!shouldBypass.data.bypass_two_factor_auth) {
          // Navigate to 2FA screen
        router.push({
          pathname: '/login/two-factor',
          params: {
            email,
            phoneNumber: phoneResponse.data.phoneNumber,
            verifiedCredentials: 'true'
          }
        });
      } else {
        const response = await api.post('/api/auth/login', {
          email,
          password
        });

        if (response.data.success) {
          const { accessToken, refreshToken, user } = response.data;
          // Small delay to show success animation before navigation
          setTimeout(() => {
          signIn(accessToken, refreshToken, user._id);
          }, 300);
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred during login';
      Alert.alert('Login Error', errorMessage);
      setErrors((prev) => ({ ...prev, password: errorMessage }));
      onLoginError?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ width: '100%', paddingHorizontal: 16 }}>
      <ThemedView style={{ flex: Platform.OS === 'ios' ? 0.8 : 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
          Welcome Back!
        </ThemedText>
        <ThemedText style={{ fontSize: 14, color: themeColors.textThird, textAlign: 'center', marginBottom: 32 }}>
          Log into your account
        </ThemedText>
      </ThemedView>

      <ThemedView style={{ position: 'relative' }}>
        <Input
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            height: 44,
            marginBottom: 4,
            fontSize: 16,
            color: themeColors.text,
            borderWidth: (touched.email && errors.email) ? 1 : 0,
            borderColor: (touched.email && errors.email) ? 'red' : '#D1D5DB',
          }}
          onFocus={() => setErrors((prev) => ({ ...prev, email: '' }))}
        />
        <Input
          value={password}
          onChangeText={handlePasswordChange}
          placeholder="Enter your password"
          secureTextEntry={!showPassword}
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingRight: 50, // Make room for the eye icon
            height: 44,
            fontSize: 14,
            color: themeColors.text,
            borderWidth: (touched.password && errors.password) ? 1 : 0,
            borderColor: (touched.password && errors.password) ? 'red' : '#D1D5DB',
          }}
          leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
          onFocus={() => setErrors((prev) => ({ ...prev, password: '' }))}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: 12,
            bottom: 16,
            padding: 4,
          }}
        >
          <Feather 
            name={showPassword ? "eye-off" : "eye"} 
            size={18} 
            color={themeColors.placeholderTextColor} 
          />
        </TouchableOpacity>
      </ThemedView>

      <ThemedView
        style={{
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}
      >
        <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AnimatedCheckBox
            value={isChecked}
            onValueChange={(value) => setIsChecked(value)}
            onCheckColor={themeColors.mountainGreen}
            tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }}
            style={{ flexDirection: 'row', alignItems: 'center' }}
            checkBoxStyle={{ height: 18, width: 18, marginRight: 8 }}
            label='Remember Me'
            textStyle={{ fontSize: 16, color: themeColors.text }}
          />
        </ThemedView>
        {/* Forgot Password Link */}
        <ThemedView style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
        }}>
          <TouchableOpacity onPress={() => router.push('/login/resetPassword')}>
            <ThemedText style={{ color: themeColors.mountainGreen, fontWeight: '600', textDecorationLine: 'underline' }}>
              Forgot Password?
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleAuth}
        disabled={loading}
        style={{
          alignItems: 'center',
          backgroundColor: themeColors.mountainGreen,
          paddingVertical: 12,
          borderRadius: 8,
          opacity: loading ? 0.7 : 1,
          marginBottom: 8,
        }}
      >
        <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
          {loading ? 'Processing...' : 'Login'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

export default EmailLogin;