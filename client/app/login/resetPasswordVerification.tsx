import React, { useState, useRef, useEffect } from 'react';
import { View, Image, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import api from '@/utils/api';

const { width } = Dimensions.get('window');

export default function ResetPasswordVerification() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<TextInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);

    // Auto-advance to next field
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace') {
      if (index > 0 && !verificationCode[index]) {
        const newCode = [...verificationCode];
        newCode[index - 1] = '';
        setVerificationCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/auth/verify-reset-code', {
        email,
        code
      });

      if (response.data.success) {
        // Navigate to set new password screen
        router.push({
          pathname: '/login/setNewPassword',
          params: { 
            email,
            code 
          }
        });
      } else {
        throw new Error(response.data.message || 'Invalid verification code');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to verify code';
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      const response = await api.post('/api/auth/reset-password-request', {
        email
      });

      if (response.data.success) {
        setResendTimer(60);
        Alert.alert('Success', 'A new verification code has been sent to your email');
      } else {
        throw new Error(response.data.message || 'Failed to resend code');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to resend code';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
          headerTitle: 'Verify Code',
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
            paddingBottom: insets.bottom,
            paddingHorizontal: 16
          }}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          <ThemedView style={{ flex: 1 }}>
            {/* Logo and Company Name Section */}
            <ThemedView style={{ 
              alignItems: 'center',
              marginTop: Platform.OS === 'ios' ? 20 : 40,
              marginBottom: 48
            }}>
              <Image
                source={require('@/assets/logo_2.png')}
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
                marginBottom: 60
              }}>
                Kinovo
              </ThemedText>
            </ThemedView>

            {/* Verification Content */}
            <ThemedView style={{ flex: 1, width: '100%' }}>
              <ThemedText style={{ 
                fontSize: 24, 
                marginBottom: 20, 
                textAlign: 'center',
                fontWeight: '600'
              }}>
                Check Your Email
              </ThemedText>
              
              <ThemedText style={{ 
                textAlign: 'center', 
                marginBottom: 40, 
                color: themeColors.textSecondary,
                lineHeight: 22
              }}>
                We've sent a 6-digit verification code to {email}. Enter it below to reset your password.
              </ThemedText>

              {/* Code Input Fields */}
              <ThemedView style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                marginBottom: 40,
                width: '100%'
              }}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => {
                      if (ref) {
                        inputRefs.current[index] = ref;
                      }
                    }}
                    style={{
                      width: 45,
                      height: 52,
                      backgroundColor: themeColors.inputBackgroundColor,
                      borderRadius: 8,
                      fontSize: 24,
                      textAlign: 'center',
                      color: themeColors.text,
                      borderWidth: 1,
                      borderColor: digit ? themeColors.mountainGreen : 'transparent'
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    selectTextOnFocus={true}
                  />
                ))}
              </ThemedView>

              {/* Verify Button */}
              <TouchableOpacity
                onPress={handleVerifyCode}
                disabled={loading || verificationCode.join('').length !== 6}
                style={{
                  backgroundColor: themeColors.mountainGreen,
                  padding: 15,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 20,
                  opacity: (loading || verificationCode.join('').length !== 6) ? 0.5 : 1,
                  width: '100%'
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
                    Verify Code
                  </ThemedText>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <ThemedView style={{ alignItems: 'center' }}>
                {resendTimer > 0 ? (
                  <ThemedText style={{ 
                    color: themeColors.textSecondary,
                    fontSize: 14
                  }}>
                    Resend code in {resendTimer}s
                  </ThemedText>
                ) : (
                  <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                    <ThemedText style={{ 
                      color: themeColors.mountainGreen,
                      fontSize: 14,
                      fontWeight: '600',
                      textDecorationLine: 'underline'
                    }}>
                      Resend code
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </ThemedView>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
} 