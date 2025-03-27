import { useState, useRef, useEffect } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import UserGeneralInfo from "@/components/ProfileAndSettings/Profile/UserGeneralInfo";
import { useLocalSearchParams } from 'expo-router';


const ProfilePage = () => {
  const [ showScrollToTop, setShowScrollToTop ] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();
  const { _id } = useLocalSearchParams();

  return (
    <ThemedView style={{ flex: 1, paddingBottom: tabBarHeight }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ 
          flex: 1,
          paddingBottom: tabBarHeight + insets.bottom,
        }}
        scrollEventThrottle={16}
      >
        <ThemedView style={{ flex: 1, marginBottom: 48 }}>
        <UserGeneralInfo _id={Array.isArray(_id) ? _id[0] : _id} />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

export default ProfilePage;