import { View, Image, Platform, RefreshControl } from 'react-native';
import React, { useState, useCallback } from 'react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ScrollView } from 'react-native';
import FriendListUserItem from '@/components/ProfileAndSettings/Settings/manageFriendsComponents/FriendListUserItem';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import type { ApiError, FriendRequest } from '@/types/allTypes';
import { useManageFriends } from '@/hooks/useManageFriends';
import { useNotifications } from '@/context/UserSessionContext';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { 
    getReceivedFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest
  } = useManageFriends();
  
  const { markFriendRequestsAsViewed } = useNotifications();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const response = await getReceivedFriendRequests();
    setRequests(response.data.requests);
    setRefreshing(false);
  }, [getReceivedFriendRequests]);

  useFocusEffect(
    useCallback(() => {
      const fetchFriendRequests = async () => {
          const response = await getReceivedFriendRequests();
          setRequests(response.data.requests);
          
          if (response.data.requests.length > 0) {
            markFriendRequestsAsViewed();
          }
      };

      fetchFriendRequests();
    }, [getReceivedFriendRequests, markFriendRequestsAsViewed])
  );

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      <ScrollView 
        contentContainerStyle={{ 
          marginTop: 16,
          paddingHorizontal: 16,
          flexGrow: 1,
        }}
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
              <IconSymbol
                name="person.badge.plus"
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
              No friend requests yet
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              Go make the first move!
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
