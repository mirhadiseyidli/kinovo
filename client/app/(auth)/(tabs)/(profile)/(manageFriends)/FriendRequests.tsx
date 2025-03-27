import { View, Image, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScrollView } from 'react-native';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import type { ApiError, FriendRequest } from '@/types/allTypes';

export default function FriendRequests() {
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const { refreshAccessToken } = useAuthSession();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const response = await axios.get(
          `${process.env.EXPO_PUBLIC_SERVER_BASE_URL}/api/managefriends/user/get/received/friend/requests`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setRequests(response.data.requests);
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
            setRequests(retryResponse.data.requests);
          } catch (retryError) {
            console.error('Retry after token refresh failed:', retryError);
          }
        } else {
          console.error('Failed to fetch friend requests:', err.message);
        }
      }
    };

    fetchFriendRequests();
  }, []);

  return (
    <ThemedView style={{ flex: 1, alignItems: 'center' }}>
      <ScrollView contentContainerStyle={{ width: '100%', paddingHorizontal: 16, flexGrow: 1 }}>
        {requests.length > 0 ? (
          requests.map((req, index) => (
            <FriendListUserItem
              _id={req._id}
              key={req._id || index}
              name={req.sender.full_name}
              subtitle={`@${req.sender.username}`}
              status="request"
              onEdit={() => console.log(`Accepted @${req.sender.username}`)}
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
