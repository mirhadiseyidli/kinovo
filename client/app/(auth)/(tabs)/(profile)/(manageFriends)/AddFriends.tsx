import { View, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import SearchBar from '@/components/SearchBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import axios from 'axios';
import { useAuthSession } from "@/components/Auth/AuthProvider";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ContactSyncScreen from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/SyncContacts';
import { IconSymbol } from '@/components/ui/IconSymbol';
import FriendListUserItemCard from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItemCard';
import FriendSuggestionsList from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendSuggestionsList';
import type { ApiError, User } from '@/types/allTypes';

export default function AddFriends() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const { refreshAccessToken } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Debounce the search query to limit API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const searchUsers = async () => {
        if (searchQuery.trim().length === 0) {
          setResults([]);
          return;
        }

        try {
          const accessToken = await AsyncStorage.getItem('accessToken');
          if (!accessToken) throw new Error('No access token available');

          const fetchResults = async () => {
            const token = await AsyncStorage.getItem('accessToken');
            const response = await axios.get(
              `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/search/users?term=${encodeURIComponent(searchQuery)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return response.data.users;
          };

          try {
            const users = await fetchResults();
            setResults(users);
          } catch (error) {
            const err = error as ApiError;
            if (err.response?.status === 401) {
              await refreshAccessToken();
              const users = await fetchResults(); // retry after refresh
              setResults(users);
            } else {
              throw err;
            }
          }
        } catch (error) {
          const err = error as ApiError;
          console.error('Search error:', err.response?.data?.message || err.message);
        }
      };

      searchUsers();
    }, 300); // delay in milliseconds

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ marginTop: 16, marginBottom: 16, paddingHorizontal: 16 }}>
        <SearchBar
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ScrollView>
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {results.length > 0 ? results.map((user) => (
            <FriendListUserItem
              _id={user._id}
              key={user._id}
              name={`${user.first_name} ${user.last_name}`}
              subtitle={user.email}
              avatarUri={user.profile_picture}
              status="manageFriend"
              onEdit={() => console.log(`Selected ${user.username}`)}
            />
          )) : (
            <View style={{ flexDirection: 'column', gap: 16 }}>
              <View>
                <FriendSuggestionsList />
              </View>
              <View>
                <ContactSyncScreen />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}