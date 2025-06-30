import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import { useUserData } from '@/hooks/useUserData';
import api from '@/utils/api';
import PasswordInput from '@/components/ProfileAndSettings/Profile/PasswordInput';
import LabeledInput from '@/components/ProfileAndSettings/Profile/LabeledInput';
import UserNameEdit from '@/components/ProfileAndSettings/Profile/EditUserName';

const EditEmail = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchUserData } = useUserData();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  React.useEffect(() => {
    const loadUserData = async () => {
      const userData = await fetchUserData();
      if (userData?.email) {
        setNewEmail(userData.email);
        setCurrentEmail(userData.email);
      }
    };
    loadUserData();
  }, []);

  const validateInputs = () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please enter your current password');
      return false;
    }
    if (!newEmail) {
      Alert.alert('Error', 'Please enter a new email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (newEmail === currentEmail) {
      Alert.alert('Error', 'New email must be different from current email');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      // First verify current password
      const verifyResponse = await api.post('/api/auth/verify-password-for-email/protected', {
        email: currentEmail,
        currentPassword
      });

      if (verifyResponse.data.success) {
        setPhoneNumber(verifyResponse.data.phoneNumber);
        setShow2FA(true);
      } else {
        Alert.alert('Error', verifyResponse.data.message || 'Failed to verify password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      setLoading(true);
      const response = await api.post('/api/auth/change-email/protected', {
        currentEmail,
        newEmail,
        verificationId,
        verificationCode
      });

      if (response.data.success) {
        Alert.alert('Success', 'Email changed successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to change email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change email');
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
          headerTitle: 'Email Address',
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
        <LabeledInput
          label="Email Address"
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
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

export default EditEmail;