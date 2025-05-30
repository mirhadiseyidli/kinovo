import { View, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import EditUserGeneralInfo from "@/components/ProfileAndSettings/Profile/EditUserGeneralInfo";

const EditProfile = () => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top }}>
      <LinearGradient
        colors={[themeColors.mountainGreen, themeColors.background, themeColors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.5, 1]}
        style={{ position: 'absolute', width: '100%', height: '100%', top: 0 }}
      />
      <EditUserGeneralInfo />
    </ThemedView>
  );
}

export default EditProfile;