import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SkeletonBox } from '@/components/Skeleton';
import { Feather } from '@expo/vector-icons';

type UserFriendsProps = {
  userId: string;
  route?: Route;
  refreshing?: boolean;
};

const FriendSkeleton = () => {
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center',
      borderRadius: 12,
    }}>
      <SkeletonBox width={48} height={48} borderRadius={999} marginRight={12} />
      <View style={{ flex: 1 }}>
        <SkeletonBox width={120} height={16} marginBottom={4} />
        <SkeletonBox width={80} height={12} />
      </View>
    </View>
  );
};

export default React.memo(function UserFriends({ userId, route, refreshing }: UserFriendsProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const { friendsList, fetchUserToViewFriends, loading, isFirstFetch } = useGetUserToViewFriends(userId);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (userId) {
      fetchUserToViewFriends();
    }
  }, [fetchUserToViewFriends, userId]);

  useEffect(() => {
    if (refreshing) {
      fetchUserToViewFriends();
    }
  }, [refreshing, fetchUserToViewFriends]);

  const renderItem = useCallback(({ item }: { item: User }) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <FriendListUserItem
          _id={item._id}
          key={item._id}
          name={item.full_name}
          avatarUri={item.profile_picture}
          subtitle={`@${item.username}`}
          status="manageFriend"
        />
      </View>
    );
  }, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={{ paddingTop: 16, width: '100%' }}>
      <View style={{
        backgroundColor: themeColors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: themeColors.border,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
      }}>
        <View style={{ marginBottom: 12 }}>
          <Feather
            name="users"
            size={32}
            color={themeColors.placeholderTextColor}
          />
        </View>
        <ThemedText 
          style={{ 
            fontSize: 16, 
            color: themeColors.placeholderTextColor, 
            textAlign: 'center',
            marginBottom: 4,
            fontWeight: '600'
          }}
        >
          No friends yet
        </ThemedText>
        <ThemedText 
          style={{ 
            fontSize: 14, 
            color: themeColors.placeholderTextColor,
            textAlign: 'center',
            opacity: 0.8
          }}
        >
          This user hasn't added any friends yet
        </ThemedText>
      </View>
    </View>
  ), [themeColors]);

  const ListHeaderComponent = useMemo(() => {
    if (isFirstFetch) {
      return (
        <View style={{ marginTop: 16, flex: 1, flexDirection: 'column', gap: 16 }}>
          <SkeletonBox width="100%" height={40} borderRadius={8} />
          <FriendSkeleton />
          <FriendSkeleton />
          <FriendSkeleton />
        </View>
      );
    } else if (friendsList.length > 0) {
      return (
        <View style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
          <SearchFriendsBar
            placeholder="Search friends..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      );
    }
    return null;
  }, [isFirstFetch, friendsList.length, searchQuery, setSearchQuery]);

  const filteredFriends = useMemo(() => 
    friendsList.filter(friend => 
      friend.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) as any[],
    [friendsList, searchQuery]
  );

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={isFirstFetch ? [] : filteredFriends}
        estimatedItemSize={80}
        renderItem={renderItem}
        ListEmptyComponent={!isFirstFetch ? ListEmptyComponent : null}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
});