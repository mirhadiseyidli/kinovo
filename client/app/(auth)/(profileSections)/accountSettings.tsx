import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, TextInput, Dimensions, ScrollView, ActivityIndicator, Platform, Alert, RefreshControl } from 'react-native';
import { Feather, Octicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import DeleteAccountComponent from '@/components/ProfileAndSettings/Settings/DeleteAccountButton';
import { useUserData } from '@/hooks/useUserData';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import { User } from '@/types/allTypes';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import SettingComponent from '@/components/ProfileAndSettings/Settings/SettingComponent';
import api from '@/utils/api';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';

const accountSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const { fetchUserData } = useUserData();
  const { requestDeletion } = useAccountDeletion();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [locationPermission, setLocationPermission] = useState<string>('Not determined');
  const [contactsPermission, setContactsPermission] = useState<string>('Not determined');
  const [photoPermission, setPhotoPermission] = useState<string>('Not determined');
  const [calendarPermission, setCalendarPermission] = useState<string>('Not determined');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const userData = await fetchUserData();
    if (userData) {
      setUser(userData);
      setEmail(userData.email || '');
      setPhoneNumber(userData.phone_number?.full_num || '');
      setUsername(userData.username || '');
    }

    // Check permissions
    const { status: locStatus } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(locStatus === 'granted' ? 'Enabled' : 'Disabled');

    const { status: contactStatus } = await Contacts.getPermissionsAsync();
    setContactsPermission(contactStatus === 'granted' ? 'Enabled' : 'Disabled');

    const { status: photoStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    setPhotoPermission(photoStatus === 'granted' ? 'Enabled' : 'Disabled');

    const { status: calendarStatus } = await Calendar.getCalendarPermissionsAsync();
    setCalendarPermission(calendarStatus === 'granted' ? 'Enabled' : 'Disabled');
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // Replace useEffect with useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleChangePassword = () => {
    console.log(user);
    if (user?.google_id) {
      Alert.alert(
        "Not Available",
        "Password change is not available for accounts created with Google. Please manage your account security through your Google account settings.",
        [{ text: "OK" }]
      );
    } else {
      router.push('/(auth)/(profileSections)/changePassword');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This will start a 30-day deletion process.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            if (user?.google_id) {
              // For Google accounts, verify with 2FA
              if (!user.phone_number?.full_num) {
                Alert.alert(
                  "Error",
                  "No phone number found. Please add a phone number in your profile settings first.",
                  [
                    {
                      text: "Go to Settings",
                      onPress: () => router.push('/(auth)/(profileSections)/editPhone')
                    },
                    {
                      text: "Cancel",
                      style: "cancel"
                    }
                  ]
                );
                return;
              }
              setShow2FA(true);
            } else {
              // For regular accounts, show password prompt
              showPasswordPrompt();
            }
          }
        }
      ]
    );
  };

  const showPasswordPrompt = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        "Enter Password",
        "Please enter your password to confirm account deletion",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete Account",
            style: "destructive",
            onPress: async (password) => {
              if (!password) {
                Alert.alert("Error", "Please enter your password");
                return;
              }
              verifyPasswordAndDelete(password);
            }
          }
        ],
        "secure-text"
      );
    } else {
      // On Android, use a regular alert with custom input handling
      Alert.alert(
        "Confirm Password",
        "For security reasons, please go to the Change Password screen to confirm your identity before deleting your account.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Go to Change Password",
            onPress: () => router.push('/(auth)/(profileSections)/changePassword')
          }
        ]
      );
    }
  };

  const verifyPasswordAndDelete = async (password: string) => {
    try {
      await api.post('/api/auth/verify-password/protected', { 
        password,
        email: user?.email
      });
      // After password verification, show final confirmation
      Alert.alert(
        "Confirm Deletion",
        "Are you absolutely sure you want to delete your account? You will have 30 days to reactivate your account before it is permanently deleted.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete Account",
            style: "destructive",
            onPress: handleConfirmDeletion
          }
        ]
      );
    } catch (err) {
      Alert.alert(
        "Error",
        "Invalid password. Please try again.",
        [
          {
            text: "OK",
            onPress: () => showPasswordPrompt() // Show the prompt again
          }
        ]
      );
    }
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      // Verify the code with backend
      const response = await api.post('/api/auth/verify-code/protected', {
        code: verificationCode,
        purpose: 'account_deletion',
        phoneNumber: user?.phone_number?.full_num
      });

      if (response.data.success) {
        // Show final confirmation after successful verification
        Alert.alert(
          "Confirm Deletion",
          "Are you absolutely sure you want to delete your account? This cannot be undone.",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Delete Account",
              style: "destructive",
              onPress: handleConfirmDeletion
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to verify code. Please try again later."
      );
    } finally {
      setShow2FA(false);
    }
  };

  const handleConfirmDeletion = async () => {
    try {
      await requestDeletion();
      Alert.alert(
        "Account Deletion Requested",
        "Your account has been marked for deletion. It will be permanently deleted after 30 days. You can cancel this process anytime before then by logging in and visiting your account settings.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate to login screen
              router.replace('/login');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to delete account. Please try again later."
      );
    }
  };

  if (show2FA) {
    return (
      <ThemedView style={{ flex: 1, padding: 16 }}>
        <TwoFactorAuth
          phoneNumber={user?.phone_number?.full_num || ''}
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={() => setShow2FA(false)}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen 
        options={{
          headerTitle: 'Account Settings',
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
      <ScrollView
        style={{ 
          flex: 1,
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.text}
            colors={[themeColors.mountainGreen]}
            progressBackgroundColor={themeColors.background}
          />
        }
      >
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
          <ThemedView style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginTop: 16 }}>Basic Information</ThemedText>
            <ThemedView style={{ flexDirection: 'column', gap: 8 }}>
              <SettingComponent 
                icon="mail" 
                title="Email Address"
                subtitle={email || 'Not set'}
                onPress={() => router.push('/(auth)/(profileSections)/editEmail')} 
              />
              <SettingComponent 
                icon="phone" 
                title="Phone Number"
                subtitle={phoneNumber || 'Not set'}
                onPress={() => router.push('/(auth)/(profileSections)/editPhone')} 
              />
              <SettingComponent 
                icon="user" 
                title="Username"
                subtitle={username || 'Not set'}
                onPress={() => router.push('/(auth)/(profileSections)/editUsername')} 
              />
            </ThemedView>
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Security & Privacy</ThemedText>
            <ThemedView style={{ flexDirection: 'column', gap: 8 }}>
              <SettingComponent 
                icon="lock" 
                title="Change Password" 
                subtitle="•••••••••••••"
                onPress={handleChangePassword}
                enabled={!user?.google_id}
              />
              <SettingComponent 
                icon="map-pin" 
                title="Location Permissions"
                subtitle={locationPermission}
                onPress={() => router.push('/(auth)/(profileSections)/locationPermissions')} 
              />
              <SettingComponent 
                icon="users" 
                title="Contacts Permissions"
                subtitle={contactsPermission}
                onPress={() => router.push('/(auth)/(profileSections)/contactsPermissions')} 
              />
              <SettingComponent 
                icon="image" 
                title="Photo Album Permissions"
                subtitle={photoPermission}
                onPress={() => router.push('/(auth)/(profileSections)/photoPermissions')} 
              />
              <SettingComponent 
                icon="calendar" 
                title="Calendar Permissions"
                subtitle={calendarPermission}
                onPress={() => router.push('/(auth)/(profileSections)/calendarPermissions')} 
              />
            </ThemedView>
          </ThemedView>
          <ThemedView style={{ alignItems: 'center' }}>
            <DeleteAccountComponent onPress={handleDeleteAccount} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
};

export default accountSettings;
