import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthSession } from '@/components/Auth/AuthProvider';
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

const UserGeneralInfo = forwardRef(({ _id }: UserGeneralInfoProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const [userToView, setUserToView] = useState<User | null>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<Partial<FriendRequestStatusProps> | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'pending' | 'friend' | null>(null);
  const { refreshAccessToken } = useAuthSession();
  const [showOptions, setShowOptions] = useState(false);
  const { fetchUserData, refetchUser } = useUserData();
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
    await refetchUser();
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/get/profile?_id=${_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUserToView(response.data.user);
      setFriendRequestStatus(response.data.friendRequest);
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          await refreshAccessToken();
          const retryToken = await AsyncStorage.getItem('accessToken');
          const retryResponse = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/get/profile?_id=${_id}`,
            { headers: { Authorization: `Bearer ${retryToken}` } }
          );

          setUserToView(retryResponse.data.user);
          setFriendRequestStatus(retryResponse.data.friendRequest);
        } catch (retryError) {
          console.error('Retry after token refresh failed:', retryError);
        }
      } else {
        console.error('Failed to fetch friend requests:', error.message);
      }
    }
  }, [_id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUser().finally(() => setRefreshing(false));
  }, [fetchUser]);

  useImperativeHandle(ref, () => ({
    onRefresh,
  }));

  // useFocusEffect(
  //   useCallback(() => {
  //     const socket = new WebSocket('ws://localhost:6000');

  //     socket.onopen = () => {
  //       if (user?._id) {
  //         socket.send(JSON.stringify({
  //           type: 'ManageFriends',
  //           userId: user._id,
  //         }));
  //       }
  //     };

  //     socket.onmessage = (event) => {
  //       const message = JSON.parse(event.data);
  //       console.log(message);

  //       switch (message.type) {
  //         case 'friendRequestReceived':
  //           console.log('📨 New friend request from:', message.from);
  //           break;

  //         case 'friendRemoved':
  //           console.log('❌ You were removed by:', message.removedBy);
  //           setFriendshipStatus(null);
  //           fetchUser(); // refetch profile info
  //           break;

  //         case 'friendAdded':
  //           console.log('✅ You were added as a friend by:', message.addedBy);
  //           setFriendshipStatus('friend');
  //           fetchUser(); // refetch to reflect updated friend state
  //           break;
  //       }
  //     };

  //     return () => {
  //       socket.close();
  //     };
  //   }, [user?._id, fetchUser])
  // );

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
    <SafeAreaView style={{ flex: 1, alignItems: 'center' }}>

      {/* Navigate Back Button */}
      <NavigateBackButton />
      
      {/* Block/Report user action button */}
      <UserProfileActionMenuButton
        showOptions={showOptions}
        setShowOptions={setShowOptions}
        onReportUser={() => {
          setShowOptions(false);
          // Report user logic here
        }}
        onBlockUser={() => {
          setShowOptions(false);
          // Block user logic here
        }}
      />

      {/* Cover Photo */}
      <UserCoverPhoto cover_photo={userToView.cover_photo}/>

      {/* Profile Photo */}
      <UserProfilePhoto profile_picture={userToView.profile_picture}/>

      {/* User Basic Info */}
      <UserProfileBasicInfo
        full_name={userToView.full_name}
        username={userToView.username}
        number_of_friends={userToView.friends?.length}
        number_of_events={userToView.events?.length}
        instagram_username={userToView.social_handles?.instagram?.username}
        facebook_username={userToView.social_handles?.instagram?.username}
      />

      {/* Add Friend / Friends and Share Buttons */}
      <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {renderFriendActionButton(userToView._id)}
        <ShareUserProfileButton targetUser={userToView._id} loadingFriendAction={loadingFriendAction} />
      </View>

      {/* User Information Tabs: [ 'About', 'Events', 'Friends' ] */}
      <View style={{ flexGrow: 1, marginTop: 16 }}>
        {userToView && <UserInfoTabs user={userToView} />}
      </View>
    </SafeAreaView>
  );
});

export default UserGeneralInfo;