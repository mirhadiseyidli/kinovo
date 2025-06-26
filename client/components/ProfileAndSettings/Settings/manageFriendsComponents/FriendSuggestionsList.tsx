import { View, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import ContactSyncScreen from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/SyncContacts';
import { IconSymbol } from '@/components/ui/IconSymbol';
import FriendListUserItemCard from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItemCard';
import { User } from '@/types/allTypes';
import { useFocusEffect } from '@react-navigation/native';
import { useManageFriends } from '@/hooks/useManageFriends';
import api from '@/utils/api';
import { useRouter } from 'expo-router';
import { SkeletonBox } from '@/components/Skeleton';

interface FriendSuggestionsListProps {
  parentRefreshing?: boolean;
}

export interface FriendSuggestionsListRef {
  refresh: () => Promise<void>;
}

const FriendSuggestionsList = forwardRef<FriendSuggestionsListRef, FriendSuggestionsListProps>(
  ({ parentRefreshing }, ref) => {
    const [suggestions, setSuggestions] = useState<User[]>([]);
    const { sendFriendRequest } = useManageFriends()
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'dark'];
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const fetchSuggestions = useCallback(async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/api/friendsuggestions/user/friends/suggestions');
        setSuggestions(response.data);
      } catch (error: any) {
        console.error('Failed to fetch suggestions:', error.message);
      } finally {
        setIsLoading(false);
      }
    }, []);

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
      refresh: fetchSuggestions
    }), [fetchSuggestions]);

    useFocusEffect(
      useCallback(() => {
        fetchSuggestions();
      }, [fetchSuggestions])
    );

    const navigateToAddFriends = () => {
      router.push('/(auth)/(manageFriends)/AddFriends');
    };

    return (
      <View>
        <View style={{ marginBottom: 16 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: themeColors.text }}>People you may know</ThemedText>
        </View>
        {suggestions.length === 0 ? (
          <TouchableOpacity
            onPress={navigateToAddFriends}
            style={{
              borderRadius: 8,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: themeColors.border,
              width: 190,
              height: 240,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 24,
              paddingHorizontal: 24,
            }}
          >
            <View style={{ marginBottom: 12 }}>
              <IconSymbol
                name="person.2.fill"
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
              No suggestions yet
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              Add more friends to get personalized suggestions!
            </ThemedText>
          </TouchableOpacity>
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
);

FriendSuggestionsList.displayName = 'FriendSuggestionsList';

export default FriendSuggestionsList;