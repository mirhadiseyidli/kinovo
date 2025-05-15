import { View, Image, Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScrollView } from 'react-native';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import type { ApiError, FriendRequest } from '@/types/allTypes';
import { useManageFriends } from '@/hooks/useManageFriends';

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const { refreshAccessToken } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { 
    getReceivedFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();

  useFocusEffect(
    useCallback(() => {
      const fetchFriendRequests = async () => {
          const response = await getReceivedFriendRequests();
          setRequests(response.data.requests);
      };

      fetchFriendRequests();
    }, [refreshAccessToken])
  );

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
      <ScrollView contentContainerStyle={{ marginTop: 16, width: '100%', paddingHorizontal: 16, flexGrow: 1 }}>
        {requests.length > 0 ? (
          requests.map((req, index) => (
            <FriendListUserItem
              _id={req.sender._id}
              key={req._id || index}
              name={req.sender.full_name}
              subtitle={`@${req.sender.username}`}
              avatarUri={req.sender.profile_picture}
              status="request"
              onAdd={() => acceptFriendRequest(req.sender._id)}
              onRemove={() => rejectFriendRequest(req.sender._id)}
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
            {`Still waiting for some connections?\nGo make the first move!`}
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}
