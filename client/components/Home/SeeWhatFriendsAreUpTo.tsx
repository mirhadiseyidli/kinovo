import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import FriendComponent from '@/components/Friend';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGetMyFriends } from '@/hooks/useGetMyFriends';
import { Friend, FriendEventActivity } from '@/types/allTypes';
import { AutoSkeletonView } from 'react-native-auto-skeleton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setEventsForFriend } from '@/store/eventStoriesSlice';

const SeeWhatFriendsAreUpTo: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = React.memo(({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const screenWidth = Dimensions.get('window').width;
  const { fetchFriends, loading } = useGetMyFriends();
  const [myFriendsList, setMyFriendsList] = useState<Friend[]>([]);
  const [friendActivityMap, setFriendActivityMap] = useState<Record<string, { eventCount: number; activityData: FriendEventActivity[] }>>({});
  const dispatch = useDispatch();

  const fetchMyFriends = async () => {
    const myEvents = await fetchFriends();
    setMyFriendsList(myEvents);
    onFinishRefresh();
  }
  
  useEffect(() => {
    if (refreshing) {
      fetchMyFriends();
    }
  }, [refreshing]);

  useEffect(() => {
    let socket: WebSocket;

    const initSocket = async () => {
      const url = process.env.EXPO_PUBLIC_WEBSOCKET_CONNECTION_URL;
      if (!url) throw new Error('Missing WebSocket connection URL');
      
      const userId = await AsyncStorage.getItem('userId');
      socket = new WebSocket(url);

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
                const friendId = item.friend._id;
                const events = item.unseen_events || [];

                if (!activityByFriend[friendId]) {
                  activityByFriend[friendId] = { eventCount: 0, activityData: [] };
                }

                activityByFriend[friendId].eventCount += events.length;
                activityByFriend[friendId].activityData.push(...events);
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
  }, [refreshing]);

  const sortedFriends = (myFriendsList ?? [])
    .filter(friend => (friendActivityMap[friend._id]?.eventCount || 0) > 0)
    .sort((a, b) => {
      const countA = friendActivityMap[a._id]?.eventCount || 0;
      const countB = friendActivityMap[b._id]?.eventCount || 0;
      return countB - countA;
    });

  const handleFriendPress = (friend_id: string) => {
    // Set events for friend in Redux store for the StoryViewer to use
    const events = friendActivityMap[friend_id]?.activityData || [];
    console.log('Setting events for friend:', friend_id, 'events count:', events.length, 'events:', events);
    dispatch(setEventsForFriend({ friendId: friend_id, events }));
  };

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
          isLoading={refreshing || loading} 
          shimmerBackgroundColor={themeColors.background} 
          gradientColors={[
            themeColors.background, 
            themeColors.inputBackgroundColor
          ]}
        >
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Friends' Activity</ThemedText>
        </AutoSkeletonView>
      </ThemedView>

      {/* Friends List */}
      {Array.isArray(myFriendsList) && (
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
                refreshing={refreshing || loading}
                eventCount={friendActivityMap[friend._id]?.eventCount || 0}
                activityData={friendActivityMap[friend._id]?.activityData || []}
                onPress={() => handleFriendPress(friend._id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
});

export default SeeWhatFriendsAreUpTo;