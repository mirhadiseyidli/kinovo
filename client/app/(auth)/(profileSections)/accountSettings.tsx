import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, TextInput, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { Feather, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import SettingsPageTitle from '@/components/ProfileAndSettings/Settings/SettingsPageTitle';
import NavigateBackButton from '@/components/NavigateBackButton';
import SettingsPageHeader from '@/components/ProfileAndSettings/Settings/SettingsPageHeader';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import SettingComponent from '@/components/ProfileAndSettings/Settings/SettingComponent';
import UserNameEdit from '@/components/ProfileAndSettings/Profile/EditUserName';
import DeleteAccountComponent from '@/components/ProfileAndSettings/Settings/DeleteAccountButton';

const accountSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  // const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically

  // if (!user) {
  //   return <Text>Loading...</Text>;
  // }

  const firstName = 'test'
  const setFirstName = () => {
    console.log('this')
  }

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedView
        style={{
          marginBottom: 6,
        }}
      >
        <SettingsPageHeader label='Account Settings'/>
      </ThemedView>
      <ScrollView
        style={{ 
          flex: 1,
          // paddingBottom: tabBarHeight
        }}
        scrollEventThrottle={16}
      >
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
          <ThemedView style={{ flex: 1, flexDirection: 'column', gap: 8 }}>
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginTop: 16 }}>Basic Information</ThemedText>
            <ThemedView style={{ flexDirection: 'column', gap: 8, paddingLeft: 10 }}>
              <UserNameEdit
                label="Email Address"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Email Address"
              />
              <UserNameEdit
                label="Phone Number"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Phone Number"
              />
              <UserNameEdit
                label="Username"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Username"
              />
            </ThemedView>
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor, marginBottom: 10 }}>Security & Privacy</ThemedText>
            <ThemedView style={{ flexDirection: 'column', gap: 8 }}>
              <SettingComponent 
                icon="user-plus" 
                title="Change Password" 
                onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
              />
              <SettingComponent 
                icon="user-plus" 
                title="Biometrics & Passkey" 
                onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
              />
              <SettingComponent 
                icon="user-plus" 
                title="Location Permissions" 
                onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
              />
              <SettingComponent 
                icon="user-plus" 
                title="Contacts Permissions" 
                onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
              />
              <SettingComponent 
                icon="user-plus" 
                title="Photo Album Permissions" 
                onPress={() => router.push('/(auth)/(manageFriends)/AddFriends')} 
              />
            </ThemedView>
          </ThemedView>
          <ThemedView style={{ alignItems: 'center' }}>
            <DeleteAccountComponent onPress={()=> console.log('delete')} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
      );
    };

export default accountSettings;
