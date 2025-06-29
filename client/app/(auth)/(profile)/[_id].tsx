import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { StatusBar, Text, View, ActivityIndicator, RefreshControl, Alert, TouchableOpacity } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { CollapsibleTabView, Route, RefreshControlProps } from "@/components/CollapsibleTab";
import { TabFlashList } from "@/components/CollapsibleTab/tab-flash-list";
import UserGeneralInfo from "@/components/ProfileAndSettings/Profile/UserGeneralInfo";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import UserEvents from "@/app/(auth)/(aboutUser)/UsersEvents";
import UserFriends from "@/app/(auth)/(aboutUser)/UsersFriends";
import UserActivities from "@/app/(auth)/(aboutUser)/UserActivities";
import { User } from "@/types/allTypes";
import { ThemedView } from "@/components/ThemedView";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { TabBar } from "react-native-tab-view";
import { useManageFriends } from "@/hooks/useManageFriends";
import { useUserData } from "@/hooks/useUserData";
import api from "@/utils/api";
import ContextMenuWithTrigger from "@/components/ContextMenuWithTrigger";
import { Feather } from "@expo/vector-icons";

type UserGeneralInfoRef = {
  onRefresh: () => void;
};

const ProfilePage = () => {
  console.log('ProfilePage');
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const navigation = useNavigation();
  const { removeFriendFromFriendList } = useManageFriends();
  const { fetchUserData } = useUserData();
  
  // Memoize derived values
  const userId = useMemo(() => Array.isArray(_id) ? _id[0] : _id, [_id]);
  const isViewingOwnProfile = useMemo(() => currentUser?._id === userId, [currentUser?._id, userId]);

  // Memoize handlers
  const handleBlockUser = useCallback(async () => {
    try {
      await api.post('/api/users/block', { userId });
      Alert.alert('Success', 'User has been blocked');
      router.back();
    } catch (error: any) {
      console.error('Error blocking user:', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to block user. Please try again.');
    }
  }, [userId]);

  const showBlockUserConfirmation = useCallback(() => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will be removed from your friends list and won\'t be able to interact with you.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: handleBlockUser
        }
      ]
    );
  }, [handleBlockUser]);

  const showRemoveFriendConfirmation = useCallback(() => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend from your friends list?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userId) {
                throw new Error('User ID is missing');
              }
              await removeFriendFromFriendList(userId);
              Alert.alert('Success', 'Friend removed successfully');
              router.back();
            } catch (error: any) {
              console.error('Error removing friend:', error?.response?.data || error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to remove friend. Please try again.');
            }
          }
        }
      ]
    );
  }, [userId, removeFriendFromFriendList]);

  // Memoize header buttons
  const headerRight = useMemo(() => {
    if (isViewingOwnProfile) return null;
    return (
      <ContextMenuWithTrigger 
        onRemove={isFriend ? showRemoveFriendConfirmation : undefined}
        onBlock={showBlockUserConfirmation}
      />
    );
  }, [isViewingOwnProfile, isFriend, showRemoveFriendConfirmation, showBlockUserConfirmation]);

  const headerLeft = useCallback(() => (
    <TouchableOpacity 
      onPress={router.back}
      style={{
        alignItems: 'center',
      }}
    >
      <Feather name="chevron-left" size={24} color={themeColors.text} />
    </TouchableOpacity>
  ), [themeColors.text]);

  // Data loading effect
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userData = await fetchUserData();
        setCurrentUser(userData);

        if (userId) {
          const response = await api.get(`/api/users/user/get/profile?_id=${userId}`);
          setViewedUser(response.data.user);
          
          const areFriends = userData.friends?.includes(userId) || 
                           response.data.user.friends?.includes(userData._id);
          setIsFriend(areFriends);
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    };
    
    loadUsers();
  }, [userId]);

  // Navigation options effect
  useEffect(() => {
    if (userId) {
      navigation.setOptions({
        headerRight: () => headerRight,
        headerLeft: headerLeft,
      });
    }
  }, [navigation, userId, headerRight, headerLeft]);

  const onStartRefresh = useCallback(async () => {
    setIsRefreshing(true);
    userInfoRef.current?.onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const renderHeader = useCallback(() => (
    <UserGeneralInfo ref={userInfoRef} _id={userId} />
  ), [userId]);

  const renderScene = useCallback(({ route }: { route: Route }) => {
    if (!userId) return null;
    
    switch (route.key) {
      case "UserEvents":
        return <UserEvents userId={userId} route={route} refreshing={isRefreshing} />;
      case "friends":
        return <UserFriends userId={userId} route={route} refreshing={isRefreshing} />;
      case "activities":
        return <UserActivities userId={userId} route={route} refreshing={isRefreshing} />;
      default:
        return null;
    }
  }, [userId, isRefreshing]);

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

  const renderRefreshControl = useCallback((refreshProps: RefreshControlProps) => {
    return (
      <View style={{ 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <ActivityIndicator 
          size='small' 
          color={themeColors.mountainGreen} 
          style={{ transform: [{ scale: 1.5 }] }}
        />
      </View>
    );
  }, [themeColors]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <CollapsibleTabView
        onStartRefresh={onStartRefresh}
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

export default React.memo(ProfilePage);