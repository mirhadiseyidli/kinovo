import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Input from '@/components/Input';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface TwoFactorAuthProps {
  verificationId: string;
  phoneNumber: string;
  onVerificationSuccess: (accessToken: string, refreshToken: string, userId: string) => void;
  onCancel: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({
  verificationId,
  phoneNumber,
  onVerificationSuccess,
  onCancel,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      // Create a credential with the verification ID and code
      const credential = auth.PhoneAuthProvider.credential(verificationId, verificationCode);
      
      // Sign in with the credential
      const userCredential = await auth().signInWithCredential(credential);
      
      // Get the user's ID token
      const idToken = await userCredential.user.getIdToken();
      
      // For refresh token, we'll use the current user's token
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not found after authentication');
      }
      
      // We'll pass an empty string for refresh token as it's handled internally by Firebase
      onVerificationSuccess(idToken, '', userCredential.user.uid);
    } catch (error: any) {
      console.error('Verification error:', error);
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'The verification code you entered is invalid. Please try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'The verification code has expired. Please request a new one.';
      }
      
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ padding: 20, borderRadius: 10 }}>
      <ThemedText style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
        Two-Factor Authentication
      </ThemedText>
      
      <ThemedText style={{ textAlign: 'center', marginBottom: 20, color: themeColors.textSecondary }}>
        Enter the verification code sent to {phoneNumber}
      </ThemedText>

      <Input
        value={verificationCode}
        onChangeText={setVerificationCode}
        placeholder="Enter verification code"
        keyboardType="number-pad"
        maxLength={6}
        style={{
          backgroundColor: themeColors.inputBackgroundColor,
          borderRadius: 8,
          paddingHorizontal: 16,
          height: 44,
          marginBottom: 20,
          fontSize: 16,
          color: themeColors.text,
        }}
      />

      <TouchableOpacity
        onPress={handleVerifyCode}
        disabled={loading}
        style={{
          backgroundColor: themeColors.mountainGreen,
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Verify Code
          </ThemedText>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCancel}
        style={{
          padding: 15,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <ThemedText style={{ color: themeColors.textSecondary }}>Cancel</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

export default TwoFactorAuth; 