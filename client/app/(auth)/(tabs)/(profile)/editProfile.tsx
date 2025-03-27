import { useState, useRef, useEffect } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import EditUserGeneralInfo from "@/components/ProfileAndSettings/Profile/EditUserGeneralInfo";

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