import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import { useUserDataLegacy as useUserData } from '@/hooks/useUserData';
import api from '@/utils/api';
import LabeledInput from '@/components/ProfileAndSettings/Profile/LabeledInput';

const EditPhone = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchUserData } = useUserData();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaddingPage, setLoaddingPage] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  React.useEffect(() => {
    const loadUserData = async () => {
      setLoaddingPage(true);
      const userData = await fetchUserData();
      if (userData?.phone_number?.full_num) {
        // Format the phone number from E.164 to (XXX) XXX-XXXX
        const rawNum = userData.phone_number.full_num.replace(/^\+1/, '');
        const formattedNum = rawNum.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        setPhoneNumber(formattedNum);
        setCurrentPhoneNumber(userData.phone_number.full_num);
      }
      if (userData?.email) {
        setUserEmail(userData.email);
      }
      setLoaddingPage(false);
    };
    loadUserData();
  }, []);

  const formatPhoneNumber = (input: string) => {
    // Remove all non-numeric characters
    const cleaned = input.replace(/\D/g, '');
    
    // Format the number as (XXX) XXX-XXXX
    if (cleaned.length >= 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length > 6) {
      return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '($1) $2-$3');
    } else if (cleaned.length > 3) {
      return cleaned.replace(/(\d{3})(\d+)/, '($1) $2');
    } else if (cleaned.length > 0) {
      return cleaned.replace(/(\d{3})/, '($1');
    }
    return cleaned;
  };

  const validatePhoneNumber = () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number');
      return false;
    }

    // Check if the phone number matches the format (XXX) XXX-XXXX
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number in the format (XXX) XXX-XXXX');
      return false;
    }

    if (phoneNumber === currentPhoneNumber) {
      Alert.alert('Error', 'New phone number must be different from current phone number');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validatePhoneNumber()) return;

    setLoading(true);
    try {
      // Convert (XXX) XXX-XXXX to +1XXXXXXXXXX format
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${cleanedPhone}`;

      // First check if the phone number is already in use
      const phoneExists = await api.post('/api/auth/check-phone/protected', {
        phoneNumber: formattedPhone
      });

      if (phoneExists.data.exists) {
        Alert.alert('Error', 'This phone number is already registered');
        return;
      }

      // Show email verification 
      setShow2FA(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to verify phone number');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      setLoading(true);
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = `+1${cleanedPhone}`;

      // If email was verified, proceed with phone change
      if (verificationId === 'email-verified') {
        const response = await api.post('/api/auth/change-phone', {
          currentPhoneNumber,
          newPhoneNumber: formattedPhone,
          emailVerified: true
        });

        if (response.data.success) {
          Alert.alert('Success', 'Phone number changed successfully', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', response.data.message || 'Failed to change phone number');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change phone number');
    } finally {
      setLoading(false);
      setShow2FA(false);
    }
  };

  if (show2FA) {
    return (
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <TwoFactorAuth
          email={userEmail}
          mode="email"
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={() => setShow2FA(false)}
        />
      </ThemedView>
    );
  }

  if (loaddingPage) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.mountainGreen} style={{ marginTop: 32 }}/>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={{ flex: 1, padding: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <LabeledInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
            placeholder="Phone Number (e.g. (123) 456-7890)"
            keyboardType="phone-pad"
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
              marginBottom: 40,
            }}
          >
            <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              {loading ? 'Verifying...' : 'Save Changes'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default EditPhone; 