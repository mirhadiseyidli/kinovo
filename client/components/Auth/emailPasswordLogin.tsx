import React, { useState } from 'react';
import { View, Alert, TouchableOpacity, Dimensions } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import axios from 'axios';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface EmailLoginProps {
  onLoginSuccess: (token: string) => void;
}

const { width } = Dimensions.get('window');

// Function to calculate font size relative to screen width
const getFontSize = (percentage: number) => (width * percentage) / 100;

const EmailLogin: React.FC<EmailLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isChecked, setIsChecked] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: 'Invalid email address' }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  };

  const handleLogin = async () => {
    if (errors.email || errors.password) {
      Alert.alert('Validation Error', 'Please fix the errors before proceeding.');
      return;
    }

    try {
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/login`, { email, password });
      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        onLoginSuccess(accessToken);
        Alert.alert('Login', `Email: ${user.email}\nName: ${user.first_name} ${user.last_name}`);
      }
    } catch (error: any) {
      console.error('Login failed:', error.response?.data?.message || error.message);
    }
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 20, justifyContent: 'space-around' }}>
      {/* Form Section */}
      <ThemedView style={{ flex: 1, width: '100%', height: '100%', alignItems: 'center' }}>
        <ThemedText style={{ fontSize: getFontSize(6), marginBottom: 8, textAlign: 'center' }}>Welcome Back!</ThemedText>
        <ThemedText style={{ fontSize: getFontSize(3.5), color: '#6B7280', textAlign: 'center' }}>
          Log into your account
        </ThemedText>
      </ThemedView>

      {/* Input Fields */}
      <ThemedView style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'flex-end' }}>
        <Input
          value={email}
          onChangeText={handleEmailChange}
          placeholder="Enter your email"
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          error={errors.password}
          secureTextEntry
        />
      </ThemedView>

      {/* Remember Me & Forgot Password */}
      <ThemedView
        style={{
          flex: 0.15,
          flexDirection: 'row',
          width: '100%',
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedView style={{ aspectRatio: 1, height: '80%', marginRight: '3%' }}>
            <CheckBox
              value={isChecked}
              onValueChange={setIsChecked}
              boxType="square"
              tintColors={{ true: '#007BFF', false: '#D1D5DB' }}
              style={{ height: '100%', width: '100%', flexShrink: 1 }}
            />
          </ThemedView>
          <ThemedText style={{ fontSize: getFontSize(3.5), color: '#6B7280' }}>Remember Me</ThemedText>
        </ThemedView>
        <ThemedText style={{ fontSize: getFontSize(3.5), color: '#3B82F6' }}>Forgot Password?</ThemedText>
      </ThemedView>

      {/* Login Button */}
      <ThemedView style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          activeOpacity={0.8} // ✅ Moved outside of style
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#14B8A6',
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleLogin}
        >
          <ThemedText style={{ fontSize: getFontSize(4), fontWeight: '500', color: 'white' }}>Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};

export default EmailLogin;