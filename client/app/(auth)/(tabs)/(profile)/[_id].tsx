import { useAuthSession } from "@/components/Auth/AuthProvider";
import { useState, useRef, useCallback, useContext } from "react";
import { View, Text, RefreshControl, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedView } from "@/components/ThemedView";
import UserProfilePreview from "@/components/ProfileAndSettings/Settings/UserProfilePreview";
import UserSettings from "@/components/ProfileAndSettings/Settings/UserSettings";
import PreferenceSettings from "@/components/ProfileAndSettings/Settings/PrefrenceSettings";
import ResourcesSettings from "@/components/ProfileAndSettings/Settings/ResourcesSettings";
import LegalAndPrivacySettings from "@/components/ProfileAndSettings/Settings/LegalAndPrivacySettings";
import SignOutComponent from "@/components/ProfileAndSettings/Settings/SignOutButton";
import { useBottomTabBarHeight, BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from "@/components/Header";
import AppInfoSettings from "@/components/ProfileAndSettings/Settings/AppInfoSettings";
import { ThemedText } from "@/components/ThemedText";
import UserGeneralInfo from "@/components/ProfileAndSettings/Profile/UserGeneralInfo";
import FavoriteActivities from "@/components/ProfileAndSettings/Profile/FavoriteActivities";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

type UserGeneralInfoRef = {
  onRefresh: () => void;
};

const ProfilePage = () => {
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();
  const { _id } = useLocalSearchParams();
  const userInfoRef = useRef<UserGeneralInfoRef>(null);

  const onRefresh = useCallback(() => {
    userInfoRef.current?.onRefresh?.();
  }, []);

  return (
    <ThemedView style={{ flex: 1, paddingBottom: tabBarHeight }}>
      <ScrollView
        overScrollMode={'auto'}
        style={{ 
          flex: 1,
        }}
        contentContainerStyle={{
          paddingBottom: tabBarHeight,
        }}
        scrollEventThrottle={8}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} progressViewOffset={insets.top} tintColor={'white'}/>
        }
      >
        <ThemedView style={{ flex: 1, marginBottom: 48 }}>
          <UserGeneralInfo ref={userInfoRef} _id={Array.isArray(_id) ? _id[0] : _id} />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

export default ProfilePage;