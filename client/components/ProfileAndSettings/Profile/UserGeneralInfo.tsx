import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserInfoTabs from '@/app/(auth)/(aboutUser)/_layout';
import NavigateBackButton from '@/components/NavigateBackButton';
import UserProfileActionMenuButton from '@/components/UserProfileActionMenuButton';
import UserCoverPhoto from './UserCoverPhoto';
import UserProfilePhoto from './UserProfilePhoto';
import UserProfileBasicInfo from './UserProfileBasicInfo';
import AddFriendButton from '@/components/AddFriendButton';
import ShareUserProfileButton from '@/components/ShareUserProfileButton';
import AlreadyFriendsAndUnfriendButton from '@/components/AlreadyFriendsAndUnfriendButton';
import { User, UserGeneralInfoProps } from '@/types/allTypes';
import { useUserData } from '@/hooks/useUserData';
import { FriendRequestStatusProps } from '@/types/allTypes';
import PendingFriendRequestButton from '@/components/PendingFriendRequestButton';
import api from '@/utils/api';
import { ThemedView } from '@/components/ThemedView';

const UserGeneralInfo = forwardRef(({ _id }: UserGeneralInfoProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const [userToView, setUserToView] = useState<User | null>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<Partial<FriendRequestStatusProps> | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'pending' | 'friend' | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const { fetchUserData, refetchUser } = useUserData();
  const [user, setUser] = useState<User | null>(null);
  const [loadingFriendAction, setLoadingFriendAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const renderFriendActionButton = (userIdToView: string) => {
    if (userIdToView === user?._id) return null;

    switch (friendshipStatus) {
      case 'pending':
        return (
          <PendingFriendRequestButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onCancelPendingRequest={() => {
                fetchUser();
            }} 
          />
        );
      case 'friend':
        return (
          <AlreadyFriendsAndUnfriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onUnfriend={() => {
                fetchUser();
            }} 
          />
        );
      default:
        return (
          <AddFriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onFriendRequestSent={() => {
                fetchUser();
            }} 
          />
        );
    }
  };

  const fetchUser = useCallback(async () => {
    const fetchedUser = await fetchUserData();
    setUser(fetchedUser);
    try {
      const response = await api.get(`/api/users/user/get/profile?_id=${_id}`);
      setUserToView(response.data.user);
      setFriendRequestStatus(response.data.friendRequest);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error.message);
    }
  }, [_id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser().finally(() => setRefreshing(false));
  }, [fetchUser]);

  useImperativeHandle(ref, () => ({
    onRefresh,
  }));

  useFocusEffect(
    useCallback(() => {
      if (friendRequestStatus?.status === 'pending') {
        setFriendshipStatus('pending');
      } else if (userToView?.friends?.includes(user?._id)) {
        setFriendshipStatus('friend');
      } else {
        setFriendshipStatus(null);
      }
    }, [friendRequestStatus?.status, user?.friends, userToView?.friends])
  );

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser])
  );

  if (!userToView) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', paddingVertical: 16, width: '100%', paddingHorizontal: 16 }}>
        {/* Profile Photo */}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <UserProfilePhoto profile_picture={userToView.profile_picture}/>
        </View>

        {/* User Basic Info */}
        <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
          <UserProfileBasicInfo
            full_name={userToView.full_name}
            username={userToView.username}
            number_of_friends={userToView.friends?.length}
            number_of_events={userToView.events?.length}
          />
        </View>
      </View>
        {(userToView.social_handles?.instagram?.username || userToView.social_handles?.facebook?.username) && (
          <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', paddingVertical: 16, width: '100%', paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
              {userToView.social_handles?.instagram?.username && (
                <View style={{ flexDirection: 'row', alignItems: 'center', width: 'auto' }}>
                  <Feather name="instagram" size={20} style={{ marginHorizontal: 10, color: themeColors.text }} />
                  <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>{userToView.social_handles?.instagram?.username}</ThemedText>
                </View>
              )}
              {userToView.social_handles?.facebook?.username && (
                <View style={{ flexDirection: 'row', alignItems: 'center', width: 'auto' }}>
                  <Feather name="facebook" size={20} style={{ marginHorizontal: 10, color: themeColors.text }} />
                  <ThemedText style={{ marginBottom: 4, fontSize: 14 }}>{userToView.social_handles?.facebook?.username}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

      {/* Add Friend / Friends and Share Buttons */}
      <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {renderFriendActionButton(userToView._id)}
        <ShareUserProfileButton targetUser={userToView._id} loadingFriendAction={loadingFriendAction} />
      </View>

      {/* User Information Tabs: [ 'About', 'Events', 'Friends' ] */}
      <View style={{ flexGrow: 1, marginTop: 16 }}>
        {userToView && <UserInfoTabs user={userToView} />}
      </View>
    </View>
  );
});

export default UserGeneralInfo;