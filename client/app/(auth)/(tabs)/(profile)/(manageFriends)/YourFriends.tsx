import { View, Image, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import SearchBar from '@/components/SearchBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { ScrollView } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import type { ApiError, Friend } from '@/types/allTypes';

export default function FriendsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { refreshAccessToken } = useAuthSession();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/friends`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFriends(response.data.friends);
      } catch (error) {
        const err = error as ApiError;
        if (err.response?.status === 401) {
          try {
            await refreshAccessToken();
            const retryToken = await AsyncStorage.getItem('accessToken');
            const retryResponse = await axios.get(
              `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/received/friend/requests`,
              { headers: { Authorization: `Bearer ${retryToken}` } }
            );
            setFriends(retryResponse.data.friends);
          } catch (retryError) {
            console.error('Retry after token refresh failed:', retryError);
          }
        } else {
          console.error('Failed to fetch friend requests:', err.message);
        }
      }
    };

    fetchFriends();
  }, []);

  return (
      <ThemedView style={{ flex: 1, alignItems: 'center' }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }} style={{ width: '100%' }}>
          <View style={{ flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            {friends.length > 0 ? (
              <>
                <View style={{ marginTop: 16, marginBottom: 16 }}>
                  <SearchBar
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                {friends.map((friend) => (
                  <FriendListUserItem
                    _id={friend._id}
                    key={friend._id}
                    name={`${friend.first_name} ${friend.last_name}`}
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
      </ThemedView>
  );
}
