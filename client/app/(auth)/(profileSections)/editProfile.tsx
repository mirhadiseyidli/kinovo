import { View, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import EditUserGeneralInfo from "@/components/ProfileAndSettings/Profile/EditUserGeneralInfo";
import { Feather } from '@expo/vector-icons';
import ProfilePreviewMenu from '@/components/ProfileAndSettings/Settings/ProfilePreviewMenu';

const EditProfile = () => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1 }}>
      <EditUserGeneralInfo />
    </ThemedView>
  );
}

export default EditProfile;