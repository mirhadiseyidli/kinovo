import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
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

const EditUsername = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchUserData } = useUserData();
  const [username, setUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaddingPage, setLoaddingPage] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  React.useEffect(() => {
    const loadUserData = async () => {
      setLoaddingPage(true);
      const userData = await fetchUserData();
      if (userData?.username) {
        setUsername(userData.username);
        setCurrentUsername(userData.username);
      }
      if (userData?.email) {
        setUserEmail(userData.email);
      }
      setLoaddingPage(false);
    };
    loadUserData();
  }, []);

  const validateUsername = () => {
    if (!username) {
      Alert.alert('Error', 'Please enter a username');
      return false;
    }

    // Add any additional username validation rules here
    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return false;
    }

    if (username === currentUsername) {
      Alert.alert('Error', 'New username must be different from current username');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateUsername()) return;

    // Show email verification
    setShow2FA(true);
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      setLoading(true);
      
      // If email was verified, proceed with username change
      if (verificationId === 'email-verified') {
        const response = await api.post('/api/auth/change-username', {
          currentUsername,
          newUsername: username,
          emailVerified: true
        });

        if (response.data.success) {
          Alert.alert('Success', 'Username changed successfully', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', response.data.message || 'Failed to change username');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change username');
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
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            autoCapitalize="none"
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

export default EditUsername; 