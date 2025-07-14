import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { useEventCount } from '@/hooks/useEventCount';
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
import { useManageFriends } from '@/hooks/useManageFriends';
import { useNotifications } from '@/context/NotificationContext';
import { UserGeneralInfoSkeleton } from '@/components/Skeleton';

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
  const { fetchUserData, isFirstFetch } = useUserData();
  const { acceptFriendRequest, rejectFriendRequest } = useManageFriends();
  const { refreshData, friendRequests } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [loadingFriendAction, setLoadingFriendAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optimisticFriendRequestSent, setOptimisticFriendRequestSent] = useState(false);
  const tabRef = useRef<ProfileTabsHandle>(null);
  
  const isOwnProfile = userToView?._id === user?._id;
  const eventCount = useEventCount(userToView?.events, user?._id, friendshipStatus === 'friend', isOwnProfile);

  const renderFriendActionButton = (userIdToView: string) => {
    if (userIdToView === user?._id) return null;

    // Calculate button count for dynamic sizing (friend action buttons + share button)
    const isAcceptDeclineMode = friendRequestStatus?.status === 'pending' && (friendRequestStatus as any)?.direction === 'received';
    const buttonCount = isAcceptDeclineMode ? 3 : 2; // Accept + Decline + Share = 3, or Friend Action + Share = 2
    const buttonFlex = 1 / buttonCount;

    // If there's a pending friend request that current user received, show accept/decline options
    if (isAcceptDeclineMode) {
      return (
        <>
          <TouchableOpacity
            style={{
              flex: buttonFlex,
              backgroundColor: themeColors.mountainGreen,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 16
            }}
            onPress={() => handleAcceptFriendRequest(userIdToView)}
          >
            {loadingFriendAction ? (
              <ActivityIndicator size={'small'} color={themeColors.text} />
            ) : (
              <View style={{ flexDirection: 'row' }}>
                <Feather name='check' color={themeColors.text} size={16}/>
                <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Accept</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: buttonFlex,
              backgroundColor: themeColors.inputBackgroundColor,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 16
            }}
            onPress={() => handleRejectFriendRequest(userIdToView)}
          >
            <View style={{ flexDirection: 'row' }}>
              <Feather name='x' color={themeColors.text} size={16}/>
              <Text style={{ fontSize: 14, color: themeColors.text, fontWeight: 'bold', marginLeft: 4 }}>Decline</Text>
            </View>
          </TouchableOpacity>
        </>
      );
    }

    // Use optimistic state if we've sent a friend request
    const effectiveFriendshipStatus = optimisticFriendRequestSent ? 'pending' : friendshipStatus;

    switch (effectiveFriendshipStatus) {
      case 'pending':
        return (
          <PendingFriendRequestButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onCancelPendingRequest={async () => {
              setOptimisticFriendRequestSent(false);
              await Promise.all([fetchUser(), refreshData()]);
            }}
            buttonFlex={buttonFlex}
          />
        );
      case 'friend':
        return (
          <AlreadyFriendsAndUnfriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onUnfriend={async () => {
              setOptimisticFriendRequestSent(false);
              await Promise.all([fetchUser(), refreshData()]);
            }}
            buttonFlex={buttonFlex}
          />
        );
      default:
        return (
          <AddFriendButton 
            targetUser={userIdToView}
            loadingFriendAction={loadingFriendAction}
            onFriendRequestSent={() => {
              // Optimistically set the state to pending
              setOptimisticFriendRequestSent(true);
            }}
            buttonFlex={buttonFlex}
          />
        );
    }
  };

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch both users' fresh data from the server
      const [currentUserResponse, viewedUserResponse] = await Promise.all([
        fetchUserData(), // Current user's data
        api.get(`/api/users/user/get/profile?_id=${_id}`) // Viewed user's profile and friend request status
      ]);

      setUser(currentUserResponse);
      setUserToView(viewedUserResponse.data.user);
      setFriendRequestStatus(viewedUserResponse.data.friendRequest);
      
      // Reset optimistic state when we get fresh data from server
      setOptimisticFriendRequestSent(false);
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error.message);
    } finally {
      setLoading(false);
    }
  }, [_id]);

  const handleAcceptFriendRequest = useCallback(async (userIdToView: string) => {
    setLoadingFriendAction(true);
    try {
      await acceptFriendRequest(userIdToView);
      
      // Clear optimistic state and refresh all data
      setOptimisticFriendRequestSent(false);
      
      // Refresh both user data and notification data
      await Promise.all([
        fetchUser(),
        refreshData()
      ]);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setLoadingFriendAction(false);
    }
  }, [acceptFriendRequest, fetchUser, refreshData]);

  const handleRejectFriendRequest = useCallback(async (userIdToView: string) => {
    setLoadingFriendAction(true);
    try {
      await rejectFriendRequest(userIdToView);
      
      // Clear optimistic state and refresh all data
      setOptimisticFriendRequestSent(false);
      
      // Refresh both user data and notification data
      await Promise.all([
        fetchUser(),
        refreshData()
      ]);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setLoadingFriendAction(false);
    }
  }, [rejectFriendRequest, fetchUser, refreshData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOptimisticFriendRequestSent(false); // Reset optimistic state on refresh
    try {
      // Refresh both user profile data and friend request data
      await Promise.all([
        fetchUser(),
        refreshData() // This will refresh friend requests to detect if someone sent us a request
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUser, refreshData]);

  useImperativeHandle(ref, () => ({
    onRefresh,
  }));
  
  useFocusEffect(
    useCallback(() => {
      if (!userToView || !user) return;

      // Reset any optimistic state first
      setOptimisticFriendRequestSent(false);

      // Check if they are already friends
      const areFriends = userToView.friends?.includes(user._id) || user.friends?.includes(userToView._id);
      
      if (areFriends) {
        setFriendshipStatus('friend');
        return;
      }

      // Check if there's a pending friend request from the profile API
      if (friendRequestStatus?.status === 'pending') {
        if ((friendRequestStatus as any)?.direction === 'sent') {
          // Current user sent the request - show pending button
          setFriendshipStatus('pending');
        } else {
          // Current user received the request - show accept/decline buttons
          setFriendshipStatus(null);
        }
        return;
      }

      // Also check the NotificationContext friend requests to see if this user sent us a request
      const pendingFriendRequest = friendRequests.find(
        (request: any) => request.sender._id === userToView._id
      );
      
      if (pendingFriendRequest) {
        // We have a pending friend request from this user - show accept/decline buttons
        setFriendRequestStatus({
          status: 'pending',
          direction: 'received'
        } as any);
        setFriendshipStatus(null);
        return;
      }

      // No friendship or pending requests - show add friend button
      setFriendshipStatus(null);
    }, [friendRequestStatus, user, userToView, friendRequests])
  );

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [fetchUser])
  );

  if (!userToView || !user) {
    return <UserGeneralInfoSkeleton />;
  }

  return (
    <ThemedView>
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', paddingVertical: 16, width: '100%', paddingHorizontal: 16 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <UserProfilePhoto 
            profile_picture={userToView.profile_picture}
            firstName={userToView.first_name}
            lastName={userToView.last_name}
          />
        </View>

        <View style={{ flex: 1.5, alignItems: 'flex-start' }}>
          <UserProfileBasicInfo
            full_name={userToView.full_name}
            username={userToView.username}
            number_of_friends={userToView.friends?.length}
            number_of_events={eventCount}
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
         <ShareUserProfileButton 
           targetUser={userToView._id} 
           loadingFriendAction={loadingFriendAction}
           buttonFlex={userToView._id === user?._id ? 1 : (friendRequestStatus?.status === 'pending' && (friendRequestStatus as any)?.direction === 'received' ? 1/3 : 1/2)}
         />
       </View>
    </ThemedView>
  );
});

export default UserGeneralInfo;