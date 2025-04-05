import { View, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useCallback } from 'react';
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
import { User } from '@/types/allTypes';
import { useFocusEffect } from '@react-navigation/native';
import { useManageFriends } from '@/hooks/useManageFriends';
import { AutoSkeletonView } from 'react-native-auto-skeleton';

export default function FriendSuggestionsList() {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const { refreshAccessToken } = useAuthSession();
  const { sendFriendRequest } = useManageFriends()
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchSuggestions = async () => {
        setIsLoading(true);
        try {
          const token = await AsyncStorage.getItem('accessToken');
          const response = await axios.get(
            `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/friendsuggestions/user/friends/suggestions`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSuggestions(response.data);
          setIsLoading(false);
        } catch (error: any) {
          if (error.response?.status === 401) {
            try {
              await refreshAccessToken();
              const retryToken = await AsyncStorage.getItem('accessToken');
              const retryResponse = await axios.get(
                `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/friendsuggestions/user/friends/suggestions`,
                { headers: { Authorization: `Bearer ${retryToken}` } }
              );
              setSuggestions(retryResponse.data);
              setIsLoading(false);
            } catch (retryError) {
              console.error('Retry after token refresh failed:', retryError);
            }
          } else {
            console.error('Failed to fetch suggestions:', error.message);
          }
        }
      };

      fetchSuggestions();
    }, [refreshAccessToken])
  );

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>People you may know</ThemedText>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 16, marginRight: 4, color: themeColors.text }}>View All</ThemedText>
          <IconSymbol
            name="chevron.right"
            size={12}
            color={Colors[colorScheme ?? 'dark'].tint}
          />
        </TouchableOpacity>
      </View>
      {suggestions.length === 0 ? (
        <ThemedText 
          style={{ 
            fontSize: 16, 
            color: themeColors.placeholderTextColor,
            textAlign: 'center'
          }}
        >
          {`No one to suggest right now.\nAdd more friends to get personalized suggestions!`}
        </ThemedText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {suggestions.map((user, index) => (
            <FriendListUserItemCard
              key={user._id}
              _id={user._id}
              name={user.full_name}
              subtitle={user.username}
              mutualFriendsNumber={user.mutualFriendsCount}
              avatarUri={user.profile_picture}
              status="suggestions"
              onAdd={() => sendFriendRequest(user._id)}
              style={{ 
                paddingHorizontal: 32,
                marginRight: index !== suggestions.length - 1 ? 16 : 0
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}