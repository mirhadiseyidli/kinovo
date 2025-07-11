import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import AddFriendsSearchBar from '@/components/AddFriendsSearchBar';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ContactSyncScreen, { ContactSyncScreenRef } from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/SyncContacts';
import { IconSymbol } from '@/components/ui/IconSymbol';
import FriendListUserItemCard from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItemCard';
import FriendSuggestionsList, { FriendSuggestionsListRef } from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendSuggestionsList';
import type { ApiError, User } from '@/types/allTypes';
import api from '@/utils/api';
import InviteFriendModal from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/InviteFriendModal';

export interface AddFriendsRef {
  openInviteModal: () => void;
}

const AddFriends = forwardRef<AddFriendsRef, {}>((props, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  
  // Refs to trigger child component refreshes
  const friendSuggestionsRef = useRef<FriendSuggestionsListRef>(null);
  const contactSyncRef = useRef<ContactSyncScreenRef>(null);

  useImperativeHandle(ref, () => ({
    openInviteModal: () => setInviteModalVisible(true),
  }));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Clear search
    setSearchQuery('');
    setResults([]);
    
    // Trigger child component refreshes in parallel
    const refreshPromises = [];
    
    if (friendSuggestionsRef.current) {
      refreshPromises.push(friendSuggestionsRef.current.refresh());
    }
    
    if (contactSyncRef.current) {
      refreshPromises.push(contactSyncRef.current.refresh());
    }
    
    // Wait for all child components to finish refreshing
    await Promise.all(refreshPromises);
    
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
      <InviteFriendModal
        visible={isInviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
      />
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
                <FriendSuggestionsList 
                  ref={friendSuggestionsRef}
                  parentRefreshing={refreshing}
                />
              </View>
              <View>
                <ContactSyncScreen 
                  ref={contactSyncRef}
                  parentRefreshing={refreshing}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
});

export default AddFriends;