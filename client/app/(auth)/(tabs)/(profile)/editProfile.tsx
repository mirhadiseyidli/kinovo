import { useAuthSession } from "@/components/Auth/AuthProvider";
import { useState, useRef, useEffect } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedView } from "@/components/ThemedView";
import UserProfilePreview from "@/components/ProfileAndSettings/Settings/UserProfilePreview";
import UserSettings from "@/components/ProfileAndSettings/Settings/UserSettings";
import PreferenceSettings from "@/components/ProfileAndSettings/Settings/PrefrenceSettings";
import ResourcesSettings from "@/components/ProfileAndSettings/Settings/ResourcesSettings";
import LegalAndPrivacySettings from "@/components/ProfileAndSettings/Settings/LegalAndPrivacySettings";
import SignOutComponent from "@/components/ProfileAndSettings/Settings/SignOutButton";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from "@/components/Header";
import AppInfoSettings from "@/components/ProfileAndSettings/Settings/AppInfoSettings";
import { ThemedText } from "@/components/ThemedText";
import UserGeneralInfo from "@/components/ProfileAndSettings/Profile/UserGeneralInfo";
import FavoriteActivities from "@/components/ProfileAndSettings/Profile/FavoriteActivities";
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditUserGeneralInfo from "@/components/ProfileAndSettings/Profile/EditUserGeneralInfo";
import { useUser } from '@/context/UserContext';

const EditProfile = () => {
  const [ showScrollToTop, setShowScrollToTop ] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  return (
    <ThemedView style={{ flex: 1, paddingBottom: tabBarHeight }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight + insets.bottom,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ThemedView style={{ flex: 1, marginBottom: 48 }}>
          <EditUserGeneralInfo />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

export default EditProfile;