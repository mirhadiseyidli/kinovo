import React, { useState } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import { Feather } from '@expo/vector-icons';
import api from '@/utils/api';

const { width } = Dimensions.get('window');

export default function SetNewPassword() {
  const router = useRouter();
  const { email, code } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setTouched(prev => ({ ...prev, password: true }));
    
    if (value.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters' }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }

    // Also check confirm password if it's been touched
    if (touched.confirmPassword) {
      if (confirmPassword && confirmPassword !== value) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setTouched(prev => ({ ...prev, confirmPassword: true }));
    
    if (value !== password) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  const handleResetPassword = async () => {
    setTouched({ password: true, confirmPassword: true });
    
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password', {
        email,
        code,
        newPassword: password
      });

      if (response.data.success) {
        Alert.alert(
          'Success!', 
          'Your password has been reset successfully. You can now log in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        throw new Error(response.data.message || 'Failed to reset password');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reset password';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = password.length >= 6 && 
                     password === confirmPassword && 
                     errors.password === '' && 
                     errors.confirmPassword === '';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'New Password',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={goBack}
            >
              <Feather name="chevron-left" size={24} color={themeColors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: themeColors.background }}
      >
        <ScrollView 
          bounces={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: 'space-between', 
            paddingBottom: insets.bottom,
            paddingHorizontal: 16
          }}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <View style={{ flex: 1 }}>
            {/* Logo and Company Name Section */}
            <ThemedView style={{ 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'flex-start', 
              paddingTop: Platform.OS === 'ios' ? 20 : 40,
              flex: 1
            }}>
              <Image
                source={require('../../assets/logo_2.png')}
                style={{
                  width: width * 0.45,
                  height: width * 0.45,
                  resizeMode: 'contain',
                }}
              />
              <ThemedText style={{ 
                fontSize: 40, 
                fontFamily: 'Helvetica Neue Bold', 
                fontWeight: 'bold', 
                letterSpacing: -1, 
                alignSelf: 'center',
                marginBottom: 60
              }}>
                Kinovo
              </ThemedText>

              {/* Title and Description */}
              <ThemedText style={{ 
                fontSize: 24, 
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 12
              }}>
                Set New Password
              </ThemedText>
              
              <ThemedText style={{ 
                fontSize: 16, 
                color: themeColors.textSecondary,
                textAlign: 'center',
                marginBottom: 40,
                lineHeight: 22
              }}>
                Choose a strong password for your account. Make sure it's at least 6 characters long.
              </ThemedText>

              {/* Password Input */}
              <ThemedView style={{ width: '100%', marginBottom: 20 }}>
                <Input
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="Enter new password"
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    backgroundColor: themeColors.inputBackgroundColor,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    height: 52,
                    fontSize: 16,
                    color: themeColors.text,
                    borderWidth: (touched.password && errors.password) ? 1 : 0,
                    borderColor: (touched.password && errors.password) ? '#ef4444' : 'transparent',
                  }}
                />
                {touched.password && errors.password ? (
                  <ThemedText style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    marginTop: 8,
                    marginLeft: 4
                  }}>
                    {errors.password}
                  </ThemedText>
                ) : null}
              </ThemedView>

              {/* Confirm Password Input */}
              <ThemedView style={{ width: '100%', marginBottom: 32 }}>
                <Input
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Confirm new password"
                  secureTextEntry={true}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    backgroundColor: themeColors.inputBackgroundColor,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    height: 52,
                    fontSize: 16,
                    color: themeColors.text,
                    borderWidth: (touched.confirmPassword && errors.confirmPassword) ? 1 : 0,
                    borderColor: (touched.confirmPassword && errors.confirmPassword) ? '#ef4444' : 'transparent',
                  }}
                />
                {touched.confirmPassword && errors.confirmPassword ? (
                  <ThemedText style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    marginTop: 8,
                    marginLeft: 4
                  }}>
                    {errors.confirmPassword}
                  </ThemedText>
                ) : null}
              </ThemedView>

              {/* Reset Password Button */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={loading || !isFormValid}
                style={{
                  backgroundColor: themeColors.mountainGreen,
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  alignItems: 'center',
                  width: '100%',
                  opacity: (loading || !isFormValid) ? 0.5 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ThemedText style={{ 
                    color: 'white', 
                    fontSize: 16, 
                    fontWeight: '600' 
                  }}>
                    Reset Password
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
} 