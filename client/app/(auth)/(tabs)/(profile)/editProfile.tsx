import { useState, useRef, useEffect } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import EditUserGeneralInfo from "@/components/ProfileAndSettings/Profile/EditUserGeneralInfo";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const EditProfile = () => {
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top, paddingBottom: tabBarHeight }}>
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