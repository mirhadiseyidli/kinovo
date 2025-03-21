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
    <ThemedView style={{ flex: 1 }}>
      <View 
        style={{
          width: '100%',
          marginTop: insets.top,
          position: 'relative',
          paddingVertical: 10,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity 
          style={{ 
            position: 'absolute',
            left: 16,
            backgroundColor: themeColors.background, 
            padding: 8, 
            borderRadius: 8, 
            zIndex: 10,
          }}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold' }}>Account Settings</ThemedText>
        </View>
      </View>
      {/* Other content goes here */}
    </ThemedView>
      );
    };

export default accountSettings;
