import React, { useEffect, useState } from 'react';
import { View, Text, Image, Button, SafeAreaView, TouchableOpacity } from 'react-native';
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

const UserGeneralInfo = ({ _id }: UserGeneralInfoProps) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const { refreshAccessToken } = useAuthSession();
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/get/profile?_id=${_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUser(response.data);
      } catch (error: any) {
        if (error.response?.status === 401) {
          try {
            await refreshAccessToken();
            const retryToken = await AsyncStorage.getItem('accessToken');
            const retryResponse = await axios.get(
              `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/users/user/get/profile?_id=${_id}`,
              { headers: { Authorization: `Bearer ${retryToken}` } }
            );
            setUser(retryResponse.data);
          } catch (retryError) {
            console.error('Retry after token refresh failed:', retryError);
          }
        } else {
          console.error('Failed to fetch friend requests:', error.message);
        }
      }
    };

    fetchUser();
  }, [_id]);

  if (!user) {
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
      <UserCoverPhoto cover_photo={user.cover_photo}/>

      {/* Profile Photo */}
      <UserProfilePhoto profile_picture={user.profile_picture}/>

      {/* User Basic Info */}
      <UserProfileBasicInfo
        full_name={user.full_name}
        username={user.username}
        number_of_friends={user.friends?.length}
        number_of_events={user.events?.length}
        instagram_username={user.social_handles?.instagram?.username}
        facebook_username={user.social_handles?.instagram?.username}
      />

      {/* Add Friend / Friends and Share Buttons */}
      <View style={{ flexDirection: 'row', width: '100%', paddingHorizontal: 16, gap: 8 }}>
        {user._id !== undefined && !user.friends?.some(friend => friend === _id) ? (
          <AddFriendButton receiver={user._id}/>
        ) : (
          <AlreadyFriendsAndUnfriendButton receiver={user._id} />
        )}
        <ShareUserProfileButton />
      </View>

      {/* User Information Tabs: [ 'About', 'Events', 'Friends' ] */}
      <View style={{ flexGrow: 1, marginTop: 16 }}>
        {user && <UserInfoTabs user={user} />}
      </View>
    </SafeAreaView>
  );
};

export default UserGeneralInfo;