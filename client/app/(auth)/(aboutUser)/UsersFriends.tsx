import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useGetUserToViewFriends } from '@/hooks/useGetUserToViewFriends';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabFlashList } from '@/components/CollapsibleTab/tab-flash-list';
import { Route } from '@/components/CollapsibleTab';
import { User } from '@/types/allTypes';

type UserFriendsProps = {
  userId: string;
  route?: Route;
};

export default React.memo(function UserFriends({ userId, route }: UserFriendsProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { friendsList, fetchUserToViewFriends, loading } = useGetUserToViewFriends(userId);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (userId) {
      fetchUserToViewFriends();
    }
  }, [fetchUserToViewFriends, userId]);

  const renderItem = ({ item }: { item: User }) => {
    return (
      <FriendListUserItem
        _id={item._id}
        key={item._id}
        name={item.full_name}
        avatarUri={item.profile_picture}
        subtitle={`@${item.username}`}
        status="manageFriend"
        onEdit={() => console.log(`Edit friend ${item.username}`)}
      />
    );
  };

  const ListEmptyComponent = () => (
    <ThemedText 
      style={{ 
        fontSize: 16, 
        color: themeColors.placeholderTextColor, 
        marginTop: 32,
        textAlign: 'center'
      }}
    >
      {`Looks like it\'s just you for now!\nAdd some friends to get started!`}
    </ThemedText>
  );

  const ListHeaderComponent = () => (
    loading ? (
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
      <View style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
        <SearchFriendsBar
          placeholder="Search friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    ) : null
  );

  const filteredFriends = friendsList.filter(friend => 
    friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) as any[];

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={loading ? [] : filteredFriends}
        estimatedItemSize={80}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? ListEmptyComponent : null}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
});