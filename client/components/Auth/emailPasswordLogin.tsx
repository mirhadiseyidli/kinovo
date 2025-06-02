import React, { useState, useEffect } from 'react';
import { Text, Alert, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
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

const REMEMBERED_EMAIL_KEY = '@kinovo_remembered_email';

const EmailLogin: React.FC<EmailLoginProps> = ({ onLoginSuccess }) => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isChecked, setIsChecked] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);

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
    try {
      // First verify credentials with login endpoint
      const loginResponse = await api.post('/api/auth/login', {
        email,
        password
      });

      if (!loginResponse.data.success) {
        throw new Error(loginResponse.data.message || 'Invalid email or password');
      }

      // If credentials are valid, get the phone number
      const phoneResponse = await api.post('/api/auth/get-phone', {
        email
      });
      
      // Save email if remember me is checked
      if (isChecked) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      // Navigate to 2FA screen with email and phone number
      router.push({
        pathname: '/login/two-factor',
        params: {
          email,
          phoneNumber: phoneResponse.data.phoneNumber,
          verifiedCredentials: 'true'
        }
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred during login';
      Alert.alert('Login Error', errorMessage);
      setErrors((prev) => ({ ...prev, password: errorMessage }));
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
        <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
          Log into your account
        </ThemedText>
      </ThemedView>

      <ThemedView>
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
          secureTextEntry
          style={{
            backgroundColor: themeColors.inputBackgroundColor,
            borderRadius: 8,
            paddingHorizontal: 16,
            height: 44,
            fontSize: 14,
            color: themeColors.text,
            borderWidth: (touched.password && errors.password) ? 1 : 0,
            borderColor: (touched.password && errors.password) ? 'red' : '#D1D5DB',
          }}
          leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
          onFocus={() => setErrors((prev) => ({ ...prev, password: '' }))}
        />
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
            style={{ height: 18, width: 18 }}
            label="Remember Me"
            topContainerStyle={{ gap: 4 }}
          />
        </ThemedView>
        <TouchableOpacity>
          <ThemedText>Forgot Password?</ThemedText>
        </TouchableOpacity>
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