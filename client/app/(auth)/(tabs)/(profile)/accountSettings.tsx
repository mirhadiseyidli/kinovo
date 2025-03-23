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

// interface LocationSuggestion {
//   placePrediction: {
//     text: {
//       text: string;
//     };
//     placeId: string;
//   };
// }

const accountSettings = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically

  const refreshAccessToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.error('No refresh token available, user needs to log in again.');
        return;
      }

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
        }
      );

      const newAccessToken = response.data.accessToken;

      if (newAccessToken) {
        await AsyncStorage.setItem('accessToken', newAccessToken);
        console.log('Access token refreshed');
      } else {
        console.error('Failed to obtain a new access token.');
      }
    } catch (error: any) {
      console.error('Failed to refresh access token:', error.response?.data?.message || error.message);
    }
  };

  // if (!user) {
  //   return <Text>Loading...</Text>;
  // }

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top }}>
      <ThemedView
        style={{
          flex: 1,
          flexGrow: 1,
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6,
        }}
      >
        <SettingsPageHeader label='Account Settings'/>
      </ThemedView>
      <ScrollView
        // ref={scrollViewRef}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight
        }}
        // onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 24, paddingHorizontal: 16 }}>
          {/* <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AISummary />
          </ThemedView> */}
          {/* <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <UpcomingEvents />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SeeWhatFriendsAreUpTo />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <PastEvents />
          </ThemedView> */}
        </ThemedView>
      </ScrollView>
      
      {/* <View 
        style={{
          width: '100%',
          paddingTop: insets.top,
          position: 'relative',
          paddingVertical: 10,
        }}
      > */}
        {/* Back Button */}
        {/* <NavigateBackButton />
        <SettingsPageTitle label='Account Settings' /> */}
        {/* Other content goes here */}
      {/* </View> */}
    </ThemedView>
      );
    };

export default accountSettings;
