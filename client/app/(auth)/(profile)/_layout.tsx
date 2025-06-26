import { Feather } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import ContextMenuWithTrigger from "@/components/ContextMenuWithTrigger";
import api from "@/utils/api";
import { useManageFriends } from "@/hooks/useManageFriends";
import { useUserData } from "@/hooks/useUserData";
import { useEffect, useState } from "react";
import { User } from "@/types/allTypes";

const ProfileLayout = () => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { _id: profileUserId } = useLocalSearchParams();
  const { removeFriendFromFriendList } = useManageFriends();
  const { fetchUserData } = useUserData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userData = await fetchUserData();
        setCurrentUser(userData);
      } catch (error) {
        console.error('Failed to load current user:', error);
      }
    };
    
    loadCurrentUser();
  }, [fetchUserData]);

  // Check if viewing own profile
  const isViewingOwnProfile = currentUser?._id === profileUserId;

  const handleBlockUser = async () => {
    try {
      await api.post('/api/users/block', { userId: profileUserId as string });
      Alert.alert('Success', 'User has been blocked');
      router.back(); // Navigate back after successful block
    } catch (error: any) {
      console.error('Error blocking user:', error?.response?.data || error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to block user. Please try again.');
    }
  };

  const showBlockUserConfirmation = () => {
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
  };

  const showRemoveFriendConfirmation = () => {
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
              if (!profileUserId) {
                throw new Error('User ID is missing');
              }
              await removeFriendFromFriendList(profileUserId as string);
              Alert.alert('Success', 'Friend removed successfully');
              router.back(); // Navigate back after successful removal
            } catch (error: any) {
              console.error('Error removing friend:', error?.response?.data || error);
              Alert.alert('Error', error?.response?.data?.message || 'Failed to remove friend. Please try again.');
            }
          }
        }
      ]
    );
  };

  return (
    <Stack screenOptions={{
        headerShown: false
    }}>
        <Stack.Screen 
            name="[_id]"
            options={{
                headerTitle: 'Profile',
                headerTintColor: themeColors.text,
                headerStyle: {
                backgroundColor: themeColors.background,
                },
                headerShadowVisible: false,
                headerShown: true,
                headerBackButtonDisplayMode: 'minimal',
                headerLeft: () => (
                <TouchableOpacity 
                    onPress={router.back}
                    style={{
                    alignItems: 'center',
                    }}
                >
                    <Feather name="chevron-left" size={24} color={themeColors.text} />
                </TouchableOpacity>
                ),
                headerRight: () => (
                  !isViewingOwnProfile ? (
                    <ContextMenuWithTrigger 
                        onRemove={showRemoveFriendConfirmation}
                        onBlock={showBlockUserConfirmation}
                    />
                  ) : null
                ),
            }} 
        />
    </Stack>
  )
}

export default ProfileLayout;
