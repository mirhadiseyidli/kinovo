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
import { useUserDataLegacy as useUserData } from '@/hooks/useUserData';
import { useAccountDeletion } from '@/hooks/useAccountDeletion';
import TwoFactorAuth from '@/components/Auth/TwoFactorAuth';
import { User } from '@/types/allTypes';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import * as Calendar from 'expo-calendar';
import SettingComponent from '@/components/ProfileAndSettings/Settings/SettingComponent';
import api from '@/utils/api';
import { useCalendarSync } from '@/hooks/useCalendarSync';

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
  const { syncEnabled, lastSyncError } = useCalendarSync();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Get calendar status including sync state
  const getCalendarStatus = () => {
    if (calendarPermission === 'Disabled') {
      return 'Disabled';
    }
    if (calendarPermission === 'Enabled') {
      if (syncEnabled) {
        return lastSyncError ? 'Enabled, Sync Error' : 'Enabled, Synced';
      } else {
        return 'Enabled, Not Synced';
      }
    }
    return 'Not determined';
  };

  const loadData = useCallback(async (fromPullToRefresh = false) => {
    try {
      setRefreshing(true);
      
      // Fetch user data
      try {
        const userData = await fetchUserData();
        if (userData) {
          setUser(userData);
          setEmail(userData.email || '');
          setPhoneNumber(userData.phone_number?.full_num || '');
          setUsername(userData.username || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }

      // Check permissions with individual error handling
      try {
        const { status: locStatus } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(locStatus === 'granted' ? 'Enabled' : 'Disabled');
      } catch (error) {
        console.error('Error checking location permissions:', error);
        setLocationPermission('Error');
      }

      try {
        const { status: contactStatus } = await Contacts.getPermissionsAsync();
        setContactsPermission(contactStatus === 'granted' ? 'Enabled' : 'Disabled');
      } catch (error) {
        console.error('Error checking contact permissions:', error);
        setContactsPermission('Error');
      }

      try {
        const { status: photoStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        setPhotoPermission(photoStatus === 'granted' ? 'Enabled' : 'Disabled');
      } catch (error) {
        console.error('Error checking photo permissions:', error);
        setPhotoPermission('Error');
      }

      try {
        const { status: calendarStatus } = await Calendar.getCalendarPermissionsAsync();
        setCalendarPermission(calendarStatus === 'granted' ? 'Enabled' : 'Disabled');
      } catch (error) {
        console.error('Error checking calendar permissions:', error);
        setCalendarPermission('Error');
      }
    } catch (error) {
      console.error('Error in loadData:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUserData]);

  const onRefresh = useCallback(async () => {
      await loadData(true);
  }, [loadData]);

  // Replace useEffect with useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleChangePassword = useCallback(() => {
    let provider = user?.google_id ? 'Google' : user?.apple_id ? 'Apple' : 'Regular';
    if (provider === 'Google' || provider === 'Apple') {
      Alert.alert(
        "Not Available",
        `Password change is not available for accounts created with ${provider}. Please manage your account security through your ${provider} account settings.`,
        [{ text: "OK" }]
      );
    } else {
      router.push('/(auth)/(profileSections)/changePassword');
    }
  }, [user?.google_id, user?.apple_id, router]);

  const handleEmailPress = useCallback(() => {
    const provider = user?.google_id ? 'Google' : user?.apple_id ? 'Apple' : null;
    if (provider) {
      Alert.alert(
        "Cannot Change Email",
        `Email address cannot be changed for accounts created with ${provider}. Please contact support if you need to update your email address.`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Email Change Unavailable",
        "Email address changes are currently not available. Please contact support if you need to update your email.",
        [{ text: "OK" }]
      );
    }
  }, [user?.google_id, user?.apple_id]);

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
            // Use email verification for all accounts
            setShow2FA(true);
          }
        }
      ]
    );
  };

  const handleVerificationSuccess = async (verificationId: string, verificationCode: string) => {
    try {
      // If email was verified, show final confirmation
      if (verificationId === 'email-verified') {
        Alert.alert(
          "Confirm Deletion",
          "Are you absolutely sure you want to delete your account? You will have 30 days to reactivate your account before it is permanently deleted.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setShow2FA(false)
            },
            {
              text: "Delete Account",
              style: "destructive",
              onPress: handleConfirmDeletion
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to verify email. Please try again.');
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
          email={email}
          mode="email"
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={() => setShow2FA(false)}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ 
          flex: 1,
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
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
                onPress={handleEmailPress} 
                enabled={false}
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
                subtitle={getCalendarStatus()}
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