import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import EventName from '@/components/CreateEvent/EventName';
import EventImage from '@/components/CreateEvent/EventImage';
import Category from '@/components/CreateEvent/EventType';
import Description from '@/components/CreateEvent/Description';
import { ButtonWithLabel } from '@/components/ButtonWithLabel';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import type { User, UserProp } from '@/types/allTypes';
import { useGetUserToViewFriends } from '@/hooks/useGetUserToViewFriends';
import { useFocusEffect } from '@react-navigation/native';
import SearchBar from '@/components/SearchBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default React.memo(function UserFriends({ user }: UserProp) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { friendsList, refetchUserToViewFriends , loading } = useGetUserToViewFriends(user?._id);
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      refetchUserToViewFriends();
    }, [refetchUserToViewFriends])
  );

  return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center' }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }} style={{ width: '100%', paddingBottom: tabBarHeight }}>
          <View style={{ flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {loading ? (
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor, 
                  marginTop: 32,
                  textAlign: 'center'
                }}
              >
                Loading...
              </ThemedText>
            ) : friendsList.length > 0 ? (
              <>
                <View style={{ marginTop: 16, marginBottom: 16 }}>
                  <SearchBar
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {friendsList.map((friend) => (
                  <FriendListUserItem
                    _id={friend._id}
                    key={friend._id}
                    name={friend.full_name}
                    avatarUri={friend.profile_picture}
                    subtitle={`@${friend.username}`}
                    status="manageFriend"
                    onEdit={() => console.log(`Edit friend ${friend.username}`)}
                  />
                ))}
              </>
            ) : (
              <ThemedText 
                style={{ 
                  fontSize: 16, 
                  color: themeColors.placeholderTextColor, 
                  marginTop: 32,
                  textAlign: 'center'
                }}
              >
                {`Looks like it\’s just you for now!\nAdd some friends to get started!`}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
  );
});