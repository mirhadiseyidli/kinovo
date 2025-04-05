import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import FriendComponent from '@/components/Friend';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGetMyFriends } from '@/hooks/useGetMyFriends';
import { Friend, FriendEventActivity } from '@/types/allTypes';
import { useFocusEffect } from '@react-navigation/native';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SeeWhatFriendsAreUpTo: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = ({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const { fetchFriends } = useGetMyFriends();
  const [myFriendsList, setMyFriendsList] = useState<Friend[]>([]);
  const [friendActivityMap, setFriendActivityMap] = useState<Record<string, { eventCount: number; activityData: FriendEventActivity[] }>>({});

  const fetchEvents = async () => {
    const myEvents = await fetchFriends();
    setMyFriendsList(myEvents);
    onFinishRefresh();
  }
  
  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [refreshing])
  );

  useFocusEffect(
    React.useCallback(() => {
      let socket: WebSocket;

      const initSocket = async () => {
        const userId = await AsyncStorage.getItem('userId');
        socket = new WebSocket('ws://localhost:6000');

        socket.onopen = () => {
          if (userId) {
            socket.send(JSON.stringify({
              type: 'FriendsEventActivity',
              userId: userId,
            }));
          }
        };

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'newFriendEventsSummary':
              if (message.data && Array.isArray(message.data)) {
                const activityByFriend: Record<string, { eventCount: number; activityData: FriendEventActivity[] }> = {};

                for (const item of message.data) {
                  const friendId = item.friend;
                  if (!activityByFriend[friendId]) {
                    activityByFriend[friendId] = { eventCount: 0, activityData: [] };
                  }
                  activityByFriend[friendId].eventCount += 1;
                  activityByFriend[friendId].activityData.push(item);
                }

                setFriendActivityMap(activityByFriend);
              }
              break;
          }
        };
      };

      initSocket();

      return () => {
        if (socket) socket.close();
      };
    }, [refreshing])
  );

  const sortedFriends = myFriendsList
    .filter(friend => (friendActivityMap[friend._id]?.eventCount || 0) > 0)
    .sort((a, b) => {
      const countA = friendActivityMap[a._id]?.eventCount || 0;
      const countB = friendActivityMap[b._id]?.eventCount || 0;
      return countB - countA;
    });

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Header */}
      <ThemedView
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          paddingHorizontal: 16,
        }}
      >
        <AutoSkeletonView 
          isLoading={refreshing} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Friends' Events</ThemedText>
        </AutoSkeletonView>
        <TouchableOpacity style={{ alignItems: 'center' }}>
          <AutoSkeletonView 
            isLoading={refreshing} 
            shimmerBackgroundColor={themeColors.background} 
            gradientColors={[
              themeColors.background, 
              themeColors.inputBackgroundColor
            ]}
          >
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, marginRight: 4 }}>See All</ThemedText>
              <IconSymbol name="chevron.right" size={12} color={Colors[colorScheme ?? 'dark'].tint} />
            </ThemedView>
          </AutoSkeletonView>
        </TouchableOpacity>
      </ThemedView>

      {/* Friends List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ width: screenWidth }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: screenWidth * 0.04 }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {sortedFriends.map((friend) => (
            <FriendComponent 
              key={friend._id} 
              _id={friend._id}
              full_name={friend.full_name}
              username={friend.username}
              profile_picture={friend.profile_picture}
              showName={true}
              refreshing={refreshing}
              eventCount={friendActivityMap[friend._id]?.eventCount || 0}
              activityData={friendActivityMap[friend._id]?.activityData || []}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

export default SeeWhatFriendsAreUpTo;