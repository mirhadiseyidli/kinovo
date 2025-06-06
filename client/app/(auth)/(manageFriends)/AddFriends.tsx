import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AddFriendsSearchBar from '@/components/AddFriendsSearchBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ContactSyncScreen from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/SyncContacts';
import { IconSymbol } from '@/components/ui/IconSymbol';
import FriendListUserItemCard from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItemCard';
import FriendSuggestionsList from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendSuggestionsList';
import type { ApiError, User } from '@/types/allTypes';
import api from '@/utils/api';

export default function AddFriends() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearchQuery('');
    setResults([]);
    setRefreshing(false);
  }, []);

  // Debounce the search query to limit API calls
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const searchUsers = async () => {
        if (searchQuery.trim().length === 0) {
          setResults([]);
          return;
        }

        try {
          const response = await api.get(`/api/search/users?query=${encodeURIComponent(searchQuery)}`);
          setResults(response.data); // Server returns users array directly
        } catch (error) {
          const err = error as ApiError;
          console.error('Search error:', err.response?.data?.message || err.message);
        }
      };

      searchUsers();
    }, 300); // delay in milliseconds

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useFocusEffect(
    React.useCallback(() => {
      return () => setSearchQuery(''); // Clear when screen loses focus
    }, [])
  );

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ marginTop: 16, marginBottom: 16, paddingHorizontal: 16, width: '100%' }}>
        <AddFriendsSearchBar
          placeholder="Search for friends..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          searchResults={results}
        />
      </View>
      <ScrollView 
        style={{ width: '100%' }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, gap: 16 }}>
          {searchQuery.trim().length === 0 && (
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