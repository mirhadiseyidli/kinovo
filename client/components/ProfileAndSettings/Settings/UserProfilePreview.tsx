import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { router, Link, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { User } from '@/types/allTypes';

const UserProfilePreview: React.FC = () => {
  const { signOut } = useAuthSession()
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) throw new Error('No access token available');

      const response = await axios.get(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      setUser(response.data);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        await refreshToken();
      } else {
        Alert.alert('Error', 'Failed to fetch user data');
        logout();
      }
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/token/refresh-token`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const { accessToken } = response.data;
      await SecureStore.setItemAsync('accessToken', accessToken);

      await fetchUserData();
    } catch (error) {
      Alert.alert('Error', 'Token refresh failed');
    }
  };

  const logout = () => {
    signOut();
  }


  const handleEditProfile = () => {
    router.push('/(auth)/(profileSections)/editProfile');
  };

  if (!user) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 140, height: 140, borderRadius: 70, marginBottom: 8, borderWidth: 2, borderColor: themeColors.mountainGreen, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {user.profile_picture ? (
          <Image
            source={{ uri: user.profile_picture }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Feather name="user" size={80} color={themeColors.mountainGreen} />
        )}
      </View>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 8 }}>{user.first_name} {user.last_name}</Text>
      <Text style={{ fontSize: 16, color: themeColors.placeholderTextColor }}>{user.email}</Text>
      <TouchableOpacity
        style={{
          backgroundColor: Colors[colorScheme ?? 'dark'].mountainGreen,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 8,
          marginTop: 16
        }}
        onPress={handleEditProfile}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>{"Edit Profile"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UserProfilePreview;
