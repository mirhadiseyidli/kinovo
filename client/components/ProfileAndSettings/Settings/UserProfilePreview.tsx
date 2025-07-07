import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, Alert, TouchableOpacity } from 'react-native';
import { router, Link, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { User } from '@/types/allTypes';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { OptimizedCDNImage } from '@/components/OptimizedCDNImage';
import api from '@/utils/api';
import { ProfilePreviewSkeleton } from '@/components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';

const UserProfilePreview: React.FC = () => {
  const { signOut } = useAuthSession()
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Auto-recovery when screen comes into focus (for server reconnection scenarios)
  useFocusEffect(
    React.useCallback(() => {
      if (loading) {
        fetchUserData();
      }
    }, [loading])
  );

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/me');
      setUser(response.data);
    } catch (error: any) {
      console.error('Failed to fetch user data:', error);
      Alert.alert('Error', 'Failed to fetch user data');
      // The api utility handles token refresh automatically, so if we get here it's a real error
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    signOut();
  }

  const handleEditProfile = () => {
    router.push('/(auth)/(profileSections)/editProfile');
  };

  // Render default profile picture component
  const renderDefaultProfilePicture = () => {
    if (!user) return null;
    
    const initials = getInitials(user.first_name || '', user.last_name || '');
    const backgroundColor = getRandomColor(user.first_name || '', user.last_name || '');
    
    return (
      <View style={{ 
        width: '100%',
        height: '100%',
        borderRadius: 70,
        backgroundColor: backgroundColor,
        justifyContent: 'center', 
        alignItems: 'center',
      }}>
        <Text style={{ 
          fontSize: 50, 
          fontWeight: 'bold', 
          color: 'white',
          textAlign: 'center'
        }}>
          {initials}
        </Text>
      </View>
    );
  };

  // Show skeleton while loading or when user data is not available
  if (loading || !user) {
    return (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <ProfilePreviewSkeleton />
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
  }

  return (
    <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ 
        width: 140, 
        height: 140, 
        borderRadius: 70, 
        marginBottom: 16, 
        borderWidth: 2, 
        borderColor: themeColors.mountainGreen, 
        overflow: 'hidden' 
      }}>
        {user.profile_picture ? (
          <OptimizedCDNImage
            source={user.profile_picture}
            fallbackCategory="profile"
            style={{ width: '100%', height: '100%' }}
            width={140}
            height={140}
            quality={85}
            priority="normal"
            enableBlurUp={true}
          />
        ) : (user.first_name || user.last_name) ? (
          // Show default profile picture with initials
          renderDefaultProfilePicture()
        ) : (
          // Show generic user icon if no name
          <Feather name="user" size={80} color={themeColors.mountainGreen} />
        )}
      </View>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginBottom: 4 }}>{user.first_name} {user.last_name}</Text>
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
