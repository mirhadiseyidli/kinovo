import { View, Image, Platform } from 'react-native';
import React, { useState, useMemo } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import type { ApiError, Friend } from '@/types/allTypes';
import { useGetMyFriends } from '@/hooks/useGetMyFriends';
import { useFocusEffect } from '@react-navigation/native';
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchFriendsBar from '@/components/SearchFriendsBar';

export default function FriendsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchFriends, refetchFriends , loading } = useGetMyFriends();
  // const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height dynamically
  const insets = useSafeAreaInsets();
  const [friendsList, setFriendsList] = useState<Friend[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const getFriendsList = async () => {
        const fetchedFriendsList = await fetchFriends();
        setFriendsList(fetchedFriendsList);
      }
      
      getFriendsList();
    }, [fetchFriends])
  );

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friendsList;
    
    const query = searchQuery.toLowerCase().trim();
    return friendsList.filter(friend => 
      friend.full_name.toLowerCase().includes(query) ||
      friend.username.toLowerCase().includes(query)
    );
  }, [friendsList, searchQuery]);

  return (
      <ThemedView style={{ flex: 1, alignItems: 'center' }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }} style={{ width: '100%', paddingBottom: insets.bottom }}>
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
                <View style={{ width: '100%', marginTop: 16, marginBottom: 16 }}>
                  <SearchFriendsBar
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => (
                    <FriendListUserItem
                      _id={friend._id}
                      key={friend._id}
                      name={friend.full_name}
                      avatarUri={friend.profile_picture}
                      subtitle={`@${friend.username}`}
                      status="manageFriend"
                      onEdit={() => console.log(`Edit friend ${friend.username}`)}
                    />
                  ))
                ) : (
                  <ThemedText 
                    style={{ 
                      fontSize: 16, 
                      color: themeColors.placeholderTextColor, 
                      marginTop: 32,
                      textAlign: 'center'
                    }}
                  >
                    No friends found matching "{searchQuery}"
                  </ThemedText>
                )}
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
                {`Looks like it\'s just you for now!\nAdd some friends to get started!`}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </ThemedView>
  );
}
