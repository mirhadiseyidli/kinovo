import React, { useState } from 'react';
import { Text, Alert, TouchableOpacity, Dimensions, Animated } from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import axios from 'axios';
import Input from '@/components/Input';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';

interface EmailLoginProps {
  onLoginSuccess: (accessToken: string, refreshToken: string) => void;
}

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
  
  const toggleCheck = (newValue: boolean) => {
    setIsChecked(newValue);
    Animated.timing(colorAnim, {
      toValue: newValue ? 1 : 0,
      duration: 300, // Adjust duration for smooth transition
      useNativeDriver: false,
    }).start();
  };

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themeColors.textSecondary, themeColors.mountainGreen], // Adjust colors as needed
  });

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
        const { accessToken, refreshToken } = response.data;
        onLoginSuccess(accessToken, refreshToken);
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, password: `Login failed: ${error.response?.data?.message || error.message}` }));
      Alert.alert('Login failed:', error.response?.data?.message || error.message);
    }
  };

  return (
    <ThemedView style={{ flex: 1, width: '100%', paddingHorizontal: 20, justifyContent: 'space-around' }}>
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
            paddingVertical: 8,
            height: screenWidth / 10,
            marginBottom: 8,
            fontSize: 14,
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
            paddingVertical: 8,
            height: screenWidth / 10,
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
          <ThemedView style={{ aspectRatio: 1, height: '80%', marginRight: '5%' }}>
            <CheckBox
              value={isChecked}
              onValueChange={toggleCheck}
              boxType="square"
              onTintColor={themeColors.mountainGreen} // Ensure border color is green when checked
              onCheckColor={themeColors.mountainGreen} // Ensure checkmark is green when checked
              tintColors={{ true: themeColors.mountainGreen, false: themeColors.text }}
              style={{ height: '95%', width: '95%', flexShrink: 1 }}
            />
          </ThemedView>
          {/* Animated Text Color */}
          <Animated.Text style={{ fontSize: getFontSize(3.5), color: interpolatedColor }}>
            Remember Me
          </Animated.Text>
        </ThemedView>
        <ThemedText style={{ fontSize: getFontSize(3.5), color: `${Colors[colorScheme ?? 'dark'].textSecondary}` }}>Forgot Password?</ThemedText>
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
          <ThemedText style={{ fontSize: getFontSize(4), fontWeight: '500', color: themeColors.background }}>Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
};

export default EmailLogin;