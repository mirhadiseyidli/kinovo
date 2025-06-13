import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { formatDistanceToNow } from 'date-fns';

type ProfileTabsHandle = {
  onRefresh: () => void;
};

const UserGeneralInfo = forwardRef(({ _id }: UserGeneralInfoProps, ref) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const [userToView, setUserToView] = useState<User | null>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<Partial<FriendRequestStatusProps> | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'pending' | 'friend' | null>(null);
  const { fetchUserData } = useUserData();
  const [user, setUser] = useState<User | null>(null);
  const [loadingFriendAction, setLoadingFriendAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const tabRef = useRef<ProfileTabsHandle>(null);

  const renderFriendActionButton = (userIdToView: string) => {
    if (userIdToView === user?._id) return null;

    switch (friendshipStatus) {
      case 'pending':
        return (
          <PendingFriendRequestButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onCancelPendingRequest={fetchUser}
          />
        );
      case 'friend':
        return (
          <AlreadyFriendsAndUnfriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onUnfriend={fetchUser}
          />
        );
      default:
        return (
          <AddFriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onFriendRequestSent={fetchUser}
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
    <ThemedView>
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', paddingVertical: 16, width: '100%', paddingHorizontal: 16 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <UserProfilePhoto profile_picture={userToView.profile_picture}/>
        </View>

        <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
          <UserProfileBasicInfo
            full_name={userToView.full_name}
            username={userToView.username}
            number_of_friends={userToView.friends?.length}
            number_of_events={userToView.events?.length}
            number_of_activities={userToView.favorite_activities?.length}
          />
        </View>
      </View>
      <View style={{ width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {userToView.bio && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Feather name='file-text' color={themeColors.text} size={16}/>
            <ThemedText style={{ fontSize: 14 }}>{userToView.bio}</ThemedText>
          </View>
        )}
        {userToView.location?.text && (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Feather name='map-pin' color={themeColors.text} size={16}/>
            <ThemedText style={{ fontSize: 14 }}>{userToView.location.text}</ThemedText>
          </View>
        )}
        {(userToView.social_handles?.instagram?.username || userToView.social_handles?.facebook?.username) && (
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
              {userToView.social_handles?.instagram?.username && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="instagram" size={16} style={{ marginRight: 8, color: themeColors.text }} />
                  <ThemedText style={{ fontSize: 14 }}>{userToView.social_handles?.instagram?.username}</ThemedText>
                </View>
              )}
              {userToView.social_handles?.facebook?.username && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather name="facebook" size={16} style={{ marginRight: 8, color: themeColors.text }} />
                  <ThemedText style={{ fontSize: 14 }}>{userToView.social_handles?.facebook?.username}</ThemedText>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Feather name='clock' color={themeColors.placeholderTextColor} size={16}/>
          <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>
            {`Member for ${formatDistanceToNow(new Date(userToView.created_at), { addSuffix: false })}`}
          </ThemedText>
          <ThemedText style={{ fontSize: 14, marginHorizontal: 2, color: themeColors.placeholderTextColor }}>·</ThemedText>
          <ThemedText style={{ fontSize: 14, color: themeColors.placeholderTextColor }}>
            {`Joined on ${new Date(userToView.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}`}
          </ThemedText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {renderFriendActionButton(userToView._id)}
        <ShareUserProfileButton targetUser={userToView._id} loadingFriendAction={loadingFriendAction} />
      </View>
    </ThemedView>
  );
});

export default UserGeneralInfo;