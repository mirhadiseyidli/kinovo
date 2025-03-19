import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { router, Link, useNavigation } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Feather } from '@expo/vector-icons';
import { useUser } from '@/context/UserContext';

const UserProfilePreview: React.FC = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { user } = useUser();

  const handleEditProfile = () => {
    router.replace('/(auth)/(tabs)/(profile)/editProfile');
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
        <Text style={{ color: Colors[colorScheme ?? 'dark'].text, fontWeight: 'bold' }}>{"Edit Profile"}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UserProfilePreview;
