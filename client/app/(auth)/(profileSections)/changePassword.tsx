import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import PasswordInput from '@/components/ProfileAndSettings/Profile/PasswordInput';
import { ThemedText } from '@/components/ThemedText';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import { useUserData } from '@/hooks/useUserData';
import api from '@/utils/api';

const ChangePassword = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchUserData } = useUserData();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  React.useEffect(() => {
    const loadUserData = async () => {
      const userData = await fetchUserData();
      if (userData?.email) {
        setCurrentEmail(userData.email);
      }
    };
    loadUserData();
  }, []);

  const validatePasswords = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validatePasswords()) return;

    setLoading(true);
    try {
      // First verify current password
      const verifyResponse = await api.post('/api/auth/verify-current-password/protected', {
        email: currentEmail,
        currentPassword
      });

      if (verifyResponse.data.success) {
        setPhoneNumber(verifyResponse.data.phoneNumber);
        setShow2FA(true);
      } else {
        Alert.alert('Error', verifyResponse.data.message || 'Failed to verify current password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify current password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/change-password/protected', {
        email: currentEmail,
        newPassword,
        verificationId,
        verificationCode
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
      setShow2FA(false);
    }
  };

  if (show2FA) {
    return (
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <TwoFactorAuth
          phoneNumber={phoneNumber}
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={() => setShow2FA(false)}
        />
      </ThemedView>
    );
  }

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
          headerTitle: 'Change Password',
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
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
        />
        <PasswordInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter your new password"
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your new password"
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={loading}
          style={{
            alignItems: 'center',
            backgroundColor: themeColors.mountainGreen,
            paddingVertical: 12,
            borderRadius: 8,
            opacity: loading ? 0.7 : 1,
            marginTop: 24,
          }}
        >
          <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {loading ? 'Verifying...' : 'Save Changes'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
};

export default ChangePassword; 