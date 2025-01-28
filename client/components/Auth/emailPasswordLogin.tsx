import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import axios from 'axios';
import Input from '@/components/Input'; // Import the reusable input component
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface EmailLoginProps {
  onLoginSuccess: (token: string) => void;
}

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
    <ThemedView className="flex-1 w-full px-5 justify-around">
      {/* Form Section */}
      <ThemedView className="flex-1 w-full h-full items-center">
        <ThemedText className="text-[6vw] mb-2 text-center">Welcome Back!</ThemedText>
        <ThemedText className="text-[3.5vw] text-gray-500 text-center">Log into your account</ThemedText>
      </ThemedView>

      {/* Input Fields */}
      <ThemedView className="flex-1 w-full h-full justify-end">
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
      <ThemedView className="flex-[0.15] flex-row w-full h-full justify-between items-center">
        <ThemedView className="flex-row flex-shrink items-center">
          <ThemedView className="flex-shrink aspect-square h-[80%] mr-[3%]">
            <CheckBox
              value={isChecked}
              onValueChange={setIsChecked}
              boxType="square"
              tintColors={{ true: '#007BFF', false: '#D1D5DB' }}
              style={{ height: '100%', width: '100%', flexShrink: 1 }}
            />
          </ThemedView>
          <ThemedText className="text-[3.5vw] text-gray-500">Remember Me</ThemedText>
        </ThemedView>
        <ThemedText className="text-[3.5vw] text-blue-500">Forgot Password?</ThemedText>
      </ThemedView>

      {/* Login Button */}
      <ThemedView className="flex-1 w-full h-full justify-end">
        <TouchableOpacity
          className="items-center justify-center bg-teal-400 py-3 rounded-lg active:bg-gray-800"
          onPress={handleLogin}
        >
          <ThemedText className="flex-shrink text-white text-[4vw] font-medium">Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};

export default EmailLogin;
