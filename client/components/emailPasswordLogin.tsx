import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import axios from 'axios';
import Input from './Input'; // Import the reusable input component
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';

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
    <View className="flex-1 w-full px-5 justify-around">
      {/* Form Section */}
      <View className="flex-1 w-full h-full items-center">
        <Text className="text-[6vw] mb-2 text-center">Welcome Back!</Text>
        <Text className="text-[3.5vw] text-gray-500 text-center">Log into your account</Text>
      </View>

      {/* Input Fields */}
      <View className="flex-1 w-full h-full justify-end">
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
      </View>

      {/* Remember Me & Forgot Password */}
      <View className="flex-[0.15] flex-row w-full h-full justify-between items-center">
        <View className="flex-row flex-shrink items-center">
          <View className="flex-shrink aspect-square h-[80%] mr-[3%]">
            <CheckBox
              value={isChecked}
              onValueChange={setIsChecked}
              boxType="square"
              tintColors={{ true: '#007BFF', false: '#D1D5DB' }}
              style={{ height: '100%', width: '100%', flexShrink: 1 }}
            />
          </View>
          <Text className="text-[3.5vw] text-gray-500">Remember Me</Text>
        </View>
        <Text className="text-[3.5vw] text-blue-500">Forgot Password?</Text>
      </View>

      {/* Login Button */}
      <View className="flex-1 w-full h-full justify-end">
        <TouchableOpacity
          className="items-center justify-center bg-teal-400 py-3 rounded-lg active:bg-gray-800"
          onPress={handleLogin}
        >
          <Text className="flex-shrink text-white text-[4vw] font-medium">Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EmailLogin;
