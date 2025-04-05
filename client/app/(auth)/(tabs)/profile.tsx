import { useAuthSession } from "@/components/Auth/AuthProvider";
import React, { useState, useRef, useEffect } from "react";
import { View, Text, Button, ScrollView, Alert } from "react-native";
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

export default React.memo(function ProfileTab() {
  const { signOut } = useAuthSession()
  const [ showScrollToTop, setShowScrollToTop ] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();

  const logout = () => {
    Alert.alert(
      "Sign Out",
      "You're about to sign out",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", onPress: () => signOut(), style: 'destructive' }
      ],
      { cancelable: true }
    );
  }

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 50); // Toggle button state after a small scroll
  };

  return (
    <ThemedView style={{ flex: 1, paddingTop: insets.top, paddingBottom: tabBarHeight }}>
      <ThemedView 
        style={{
          flex: 1,
          flexGrow: 1,
          maxHeight: tabBarHeight - insets.bottom, // Combine tabBarHeight and top inset
          marginBottom: 6
        }}
      >
        <Header />
      </ThemedView>
      <ScrollView
        ref={scrollViewRef}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight + insets.bottom
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <ThemedView style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <UserProfilePreview />
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <UserSettings />
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <PreferenceSettings />
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <ResourcesSettings />
          </ThemedView>
          <ThemedView style={{ flex: 1 }}>
            <LegalAndPrivacySettings />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 32 }}>
            <SignOutComponent 
              onPress={logout} 
            />
          </ThemedView>
          <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppInfoSettings />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
})