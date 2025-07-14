import React, { useState } from 'react';
import { TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useUserData } from '@/hooks/useUserData';
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

  React.useEffect(() => {
    const loadUserData = async () => {
      setLoaddingPage(true);
      const userData = await fetchUserData();
      if (userData?.username) {
        setUsername(userData.username);
        setCurrentUsername(userData.username);
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

    // Show confirmation alert
    Alert.alert(
      'Confirm Username Change',
      `Are you sure you want to change your username from '${currentUsername}' to '${username}'?`,
      [
        {
          text: 'Cancel',
          style: 'destructive',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await api.post('/api/auth/change-username/protected', {
                currentUsername,
                newUsername: username,
              });

              if (response.data.success) {
                Alert.alert('Success', 'Username changed successfully', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', response.data.message || 'Failed to change username');
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to change username');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loaddingPage) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.mountainGreen} style={{ marginTop: 32 }}/>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
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
          }}
        >
          <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
};

export default EditUsername; 