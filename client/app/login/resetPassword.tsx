import React, { useState } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Input from '@/components/Input';
import { Feather } from '@expo/vector-icons';
import api from '@/utils/api';

const { width } = Dimensions.get('window');

export default function ResetPassword() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '' });
  const [touched, setTouched] = useState({ email: false });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setTouched(prev => ({ ...prev, email: true }));
    
    if (!validateEmail(value)) {
      setErrors(prev => ({ ...prev, email: 'Invalid email address' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handleSendResetCode = async () => {
    setTouched({ email: true });
    
    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password-request', {
        email: email.toLowerCase().trim()
      });

      if (response.data.success) {
        // Navigate to verification code screen
        router.push({
          pathname: '/login/resetPasswordVerification',
          params: { email: email.toLowerCase().trim() }
        });
      } else {
        throw new Error(response.data.message || 'Failed to send reset code');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset code';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Reset Password',
          headerTintColor: themeColors.text,
          headerStyle: {
            backgroundColor: themeColors.background,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={router.back}
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
                Forgot Your Password?
              </ThemedText>
              
              <ThemedText style={{ 
                fontSize: 16, 
                color: themeColors.textSecondary,
                textAlign: 'center',
                marginBottom: 40,
                lineHeight: 22
              }}>
                Enter your email address and we'll send you a verification code to reset your password.
              </ThemedText>

              {/* Email Input */}
              <ThemedView style={{ width: '100%', marginBottom: 48 }}>
                <Input
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    backgroundColor: themeColors.inputBackgroundColor,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    height: 52,
                    fontSize: 16,
                    color: themeColors.text,
                    borderWidth: (touched.email && errors.email) ? 1 : 0,
                    borderColor: (touched.email && errors.email) ? '#ef4444' : 'transparent',
                  }}
                />
                {touched.email && errors.email ? (
                  <ThemedText style={{ 
                    color: '#ef4444', 
                    fontSize: 14, 
                    marginTop: 8,
                    marginLeft: 4
                  }}>
                    {errors.email}
                  </ThemedText>
                ) : null}
              </ThemedView>

              {/* Send Code Button */}
              <TouchableOpacity
                onPress={handleSendResetCode}
                disabled={loading || !email || errors.email !== ''}
                style={{
                  backgroundColor: themeColors.mountainGreen,
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  alignItems: 'center',
                  width: '100%',
                  opacity: (loading || !email || errors.email !== '') ? 0.5 : 1,
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
                    Send Verification Code
                  </ThemedText>
                )}
              </TouchableOpacity>
            </ThemedView>
          </View>

          {/* Back to Login Link */}
          <ThemedView style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginTop: 20
          }}>
            <ThemedText>Remember your password?</ThemedText>
            <TouchableOpacity onPress={() => router.back()}>
              <ThemedText style={{ 
                color: themeColors.mountainGreen, 
                fontWeight: '600', 
                textDecorationLine: 'underline', 
                marginLeft: 4 
              }}>
                Back to Login
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
} 