import React, { useCallback, useRef, useState, useEffect } from "react";
import { StatusBar, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { CollapsibleTabView, Route, RefreshControlProps } from "@/components/CollapsibleTab";
import { TabFlashList } from "@/components/CollapsibleTab/tab-flash-list";
import UserGeneralInfo from "@/components/ProfileAndSettings/Profile/UserGeneralInfo";
import { useLocalSearchParams } from "expo-router";
import UserEvents from "@/app/(auth)/(aboutUser)/UsersEvents";
import UserFriends from "@/app/(auth)/(aboutUser)/UsersFriends";
import UserActivities from "@/app/(auth)/(aboutUser)/UserActivities";
import { User } from "@/types/allTypes";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { TabBar } from "react-native-tab-view";

type UserGeneralInfoRef = {
  onRefresh: () => void;
};

const ProfilePage = () => {
  const { _id } = useLocalSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [routes] = useState<Route[]>([
    { key: "UserEvents", title: "Events", index: 0 },
    { key: "friends", title: "Friends", index: 1 },
    { key: "activities", title: "Activities", index: 2 },
  ]);
  const [index, setIndex] = useState(0);
  const animationHeaderPosition = useSharedValue(0);
  const animationHeaderHeight = useSharedValue(0);
  const userInfoRef = useRef<UserGeneralInfoRef>(null);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const userId = Array.isArray(_id) ? _id[0] : _id;



  const renderScene = useCallback(({ route }: { route: Route }) => {
    if (!userId) return null;
    
    switch (route.key) {
      case "UserEvents":
        return <UserEvents userId={userId} route={route} />;
      case "friends":
        return <UserFriends userId={userId} route={route} />;
      case "activities":
        return <UserActivities userId={userId} route={route} />;
      default:
        return null;
    }
  }, [userId]);

  const onStartRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  const renderHeader = () => (
    <UserGeneralInfo ref={userInfoRef} _id={Array.isArray(_id) ? _id[0] : _id} />
  );

  // Custom tab bar renderer
  const renderTabBar = useCallback((props: any) => {
    return (
      <TabBar
        {...props}
        style={{ 
          backgroundColor: themeColors.background,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.border
        }}
        indicatorStyle={{ 
          backgroundColor: themeColors.mountainGreen
        }}
        activeColor={themeColors.text}
        inactiveColor={themeColors.placeholderTextColor}
        labelStyle={{ 
          fontWeight: '600',
          textTransform: 'none'
        }}
      />
    );
  }, [themeColors]);

  // Custom refresh control renderer
  const renderRefreshControl = useCallback((refreshProps: RefreshControlProps) => {
    return (
      <RefreshControl 
        refreshing={isRefreshing} 
        onRefresh={onStartRefresh}
        tintColor={themeColors.mountainGreen}
        colors={[themeColors.mountainGreen]}
      />
    );
  }, [isRefreshing, onStartRefresh]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <CollapsibleTabView
        isRefreshing={isRefreshing}
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        renderRefreshControl={renderRefreshControl}
        lazy
        renderScrollHeader={renderHeader}
        animationHeaderPosition={animationHeaderPosition}
        animationHeaderHeight={animationHeaderHeight}
        refreshControlColor={themeColors.mountainGreen}
      />
    </ThemedView>
  );
}

export default ProfilePage;