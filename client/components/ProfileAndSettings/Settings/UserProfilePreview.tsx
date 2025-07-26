import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, TouchableOpacity } from 'react-native';
import { router, Link, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import { User } from '@/types/allTypes';
import { getInitials, getRandomColor } from '@/utils/profilePictureGenerator';
import { ProfilePreviewSkeleton, SkeletonBox } from '@/components/Skeleton';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useUserData } from '@/hooks/useUserData';

const UserProfilePreview: React.FC = () => {
  const { signOut } = useAuthSession()
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  
  // Use the robust useUserData hook with TanStack Query
  const { user, loading, isError, error, refetch } = useUserData();

  // Handle authentication errors
  useEffect(() => {
    if (isError && error) {
      console.error('Failed to fetch user data:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => signOut()
            }
          ]
        );
      }
    }
  }, [isError, error, signOut]);

  // Auto-recovery when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Only refetch if there was an error or no data
      if (isError || !user) {
        refetch();
      }
    }, [isError, user, refetch])
  );

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

  // Show skeleton while loading
  if (loading) {
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

  // Show error state with retry button
  if (isError || !user) {
    return (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ 
          width: 140, 
          height: 140, 
          borderRadius: 70, 
          marginBottom: 16, 
          backgroundColor: themeColors.inputBackgroundColor,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Feather name="alert-circle" size={60} color={themeColors.placeholderTextColor} />
        </View>
        <Text style={{ 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: themeColors.text, 
          marginBottom: 8 
        }}>
          Unable to load profile
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: themeColors.placeholderTextColor,
          textAlign: 'center',
          marginBottom: 16,
          paddingHorizontal: 32
        }}>
          {error?.message || 'Please check your network connection and try again.'}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: themeColors.mountainGreen,
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
          }}
          onPress={() => refetch()}
        >
          <Feather name="refresh-cw" size={16} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
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
          <Image
            source={user.profile_picture}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onError={() => {
              return renderDefaultProfilePicture();
            }}
            onProgress={() => {
              return <SkeletonBox width={140} height={140} borderRadius={70} />;
            }}
            cachePolicy="disk"
            allowDownscaling={true}
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
