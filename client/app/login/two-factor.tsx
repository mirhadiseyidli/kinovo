import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import axios from 'axios';
import { Alert, Image, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSession } from '@/components/Auth/AuthProvider';

const { width } = Dimensions.get('window');

export default function TwoFactorScreen() {
  const router = useRouter();
  const { email, phoneNumber, verifiedCredentials } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { signIn } = useAuthSession();

  // Redirect back to login if credentials weren't verified
  useEffect(() => {
    if (verifiedCredentials !== 'true') {
      Alert.alert('Error', 'Please login with your credentials first');
      router.replace('/login');
    }
  }, [verifiedCredentials]);

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      // Send verification details to backend
      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/auth/verify-login`, {
        email,
        verificationId,
        verificationCode
      });
      console.log("Response:", response.data);

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        signIn(accessToken, refreshToken, user._id);
      } else {
        throw new Error(response.data.message || 'Failed to verify login');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to complete verification');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: themeColors.background }}
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
            marginTop: Platform.OS === 'ios' ? 60 : 40,
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
              letterSpacing: -1
            }}>
              Kinovo
            </ThemedText>
          </ThemedView>

          {/* Two Factor Auth Component */}
          <ThemedView style={{ flex: 1, width: '100%' }}>
            <TwoFactorAuth
              phoneNumber={phoneNumber as string}
              onVerificationSuccess={handleVerificationSuccess}
              onCancel={handleCancel}
            />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 