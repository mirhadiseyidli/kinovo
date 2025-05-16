import React, { useState } from 'react';
import { Text, Alert, TouchableOpacity, Dimensions, Animated } from 'react-native';
import CheckBox from 'expo-checkbox';
import axios from 'axios';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { AuthLoginProps, ApiError, EmailLoginProps } from '@/types/allTypes';
import AnimatedCheckBox from '../AnimatedCheckBox';

const { width } = Dimensions.get('window');

// Function to calculate font size relative to screen width
const getFontSize = (percentage: number) => (width * percentage) / 100;

const EmailLogin: React.FC<EmailLoginProps> = ({ onLoginSuccess }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', other: '' });
  const [isChecked, setIsChecked] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const colorAnim = useState(new Animated.Value(0))[0];

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: '' })); // Clear error when editing
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: '' })); // Clear error when editing
  };

  const handleLogin = async () => {
    setTouched({ email: true, password: true }); // Mark fields as touched
    if (!validateEmail(email)) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email address' }));
      Alert.alert('Login Failed', 'Invalid email address');
      return;
    }
    if (password.length < 6) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 6 characters' }));
      Alert.alert('Login Failed', 'Password must be at least 6 characters');
      return;
    }

    try {
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/login`, { email, password });
      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        onLoginSuccess(accessToken, refreshToken, user._id);
      }
    } catch (error: unknown) {
      const err = error as ApiError;
      setErrors((prev) => ({ ...prev, password: `Login failed: ${err.response?.data?.message || err.message}` }));
      Alert.alert('Login failed:', err.response?.data?.message || err.message);
    }
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 16, justifyContent: 'space-around' }}>
      {/* Form Section */}
      <ThemedView style={{ flex: 1, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText style={{ fontSize: getFontSize(6), marginBottom: 8, textAlign: 'center' }}>Welcome Back!</ThemedText>
        <ThemedText style={{ fontSize: getFontSize(3.5), color: `${Colors[colorScheme ?? 'dark'].textSecondary}`, textAlign: 'center' }}> {/* fix color here */}
          Log into your account
        </ThemedText>
      </ThemedView>

      {/* Input Fields */}
      <ThemedView style={{ flex: 1.5, width: '100%', height: '100%', justifyContent: 'flex-end' }}>
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
            marginBottom: 8,
            fontSize: 16,
            color: themeColors.text,
            borderWidth: (touched.email && errors.email) ? 1 : 0,
            borderColor: (touched.email && errors.email) ? 'red' : '#D1D5DB',
          }}
          leftIcon={<Feather name="mail" size={18} color={themeColors.placeholderTextColor} />}
          onFocus={() => setErrors((prev) => ({ ...prev, email: '' }))} // Clear error on focus
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
            marginBottom: 8,
            fontSize: 14,
            color: themeColors.text,
            borderWidth: (touched.password && errors.password) ? 1 : 0,
            borderColor: (touched.password && errors.password) ? 'red' : '#D1D5DB',
          }}
          leftIcon={<Feather name="lock" size={18} color={themeColors.placeholderTextColor} />}
          onFocus={() => setErrors((prev) => ({ ...prev, password: '' }))} // Clear error on focus
        />
      </ThemedView>

      {/* Remember Me & Forgot Password */}
      <ThemedView
        style={{
          flex: 0.25,
          flexDirection: 'row',
          width: '100%',
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedView>
            <AnimatedCheckBox
              value={isChecked}
              onValueChange={setIsChecked}
              onCheckColor={themeColors.mountainGreen} // checkmark color
              tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }} // border color states
              style={{ height: 18, width: 18 }} // size or any custom inline style
              label='Remember Me'
              topContainerStyle={{ gap: 4 }}
            />
          </ThemedView>
        </ThemedView>
        <ThemedText>Forgot Password?</ThemedText>
      </ThemedView>

      {/* Login Button */}
      <ThemedView style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          activeOpacity={0.8} // ✅ Moved outside of style
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: themeColors.mountainGreen,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleLogin}
        >
          <ThemedText style={{ fontSize: getFontSize(4), fontWeight: 'bold', color: themeColors.text }}>Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};

export default EmailLogin;