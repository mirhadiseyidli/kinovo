import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import FriendRequestCard from '@/components/FriendRequestCard';
import NotificationCard from '@/components/NotificationCard';
import NavigateBackButton from '@/components/NavigateBackButton';
import { useNotifications } from '@/context/NotificationContext';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/utils/api';

export default function NotificationsPage() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [allNotifications, setAllNotifications] = useState<NotificationData[]>([]);
  
  const {
    friendRequests,
    notifications,
    loading,
    refreshing,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markNotificationAsViewed,
    markAllNotificationsAsViewed,
    refreshData
  } = useNotifications();

  // Update local notifications when context notifications change
  useEffect(() => {
    if (page === 1) {
      setAllNotifications(notifications);
    }
  }, [notifications, page]);

  // Load more notifications
  const loadMoreNotifications = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;
    
    setLoadingMore(true);
    try {
      const response = await api.get(`/api/notifications?page=${page + 1}&limit=20`);

      if (response.status === 200) {
        const newNotifications = response.data.notifications || [];
        
        if (newNotifications.length === 0) {
          setHasMoreData(false);
        } else {
          setAllNotifications(prev => [...prev, ...newNotifications]);
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMoreData]);

  // Reset pagination on refresh
  const handleRefresh = useCallback(async () => {
    setPage(1);
    setHasMoreData(true);
    setAllNotifications([]);
    await refreshData();
  }, [refreshData]);

  // Mark all notifications as viewed when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // This runs when the screen loses focus
        markAllNotificationsAsViewed();
      };
    }, []) // Remove markAllNotificationsAsViewed from dependencies since it's now stable
  );

  // Sort notifications: unread first, then read, all sorted by time (newest first)
  // Exclude pending friend request notifications (they show in Friend Requests section)
  const sortedNotifications = useMemo(() => {
    return [...allNotifications]
      .filter(notification => {
        // Exclude pending friend request notifications - they show in Friend Requests section
        if (notification.type === 'friend_request' && notification.status === 'pending') {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // First sort by read status (unread first)
        if (a.is_seen !== b.is_seen) {
          return a.is_seen ? 1 : -1;
        }
        // Then sort by time (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [allNotifications]);

  // Separate unread and read notifications (excluding pending friend requests)
  const unreadNotifications = useMemo(() => 
    sortedNotifications.filter(n => !n.is_seen), [sortedNotifications]
  );
  
  const readNotifications = useMemo(() => 
    sortedNotifications.filter(n => n.is_seen), [sortedNotifications]
  );

  const handleNotificationPress = (notification: NotificationData) => {
    // Mark as viewed but keep in list
    markNotificationAsViewed(notification._id);
    
    // Navigate to relevant screen based on notification type
    if (notification.type === 'friend_request') {
      // Navigate to the sender's profile for new friend request notifications
      if (notification.sender?._id) {
        router.push({
          pathname: "/(auth)/(profile)/[_id]" as const,
          params: { _id: notification.sender._id }
        });
      }
    } else if (notification.type === 'friend_request_accepted' || notification.type === 'friend_request_rejected') {
      // Navigate to the sender's profile for friend request notifications
      if (notification.sender?._id) {
        router.push({
          pathname: "/(auth)/(profile)/[_id]" as const,
          params: { _id: notification.sender._id }
        });
      }
    } else if (notification.event?._id) {
      // Navigate to event for event-related notifications
      router.push({
        pathname: "/(auth)/(viewEvent)/[event_id]" as const,
        params: { event_id: notification.event._id }
      });
    }
  };

  // Render header component
  const renderHeader = () => (
    <View>
      {/* Friend Requests Section */}
      <View style={{ marginBottom: 24 }}>
        {/* Section Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingHorizontal: 16, 
          marginBottom: 16 
        }}>
          <Feather name="users" size={20} color={themeColors.tint} style={{ marginRight: 8 }} />
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            fontWeight: 'bold',
            flex: 1
          }}>
            Friend Requests
          </Text>
          {friendRequests.length > 0 && (
            <View
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                {friendRequests.length}
              </Text>
            </View>
          )}
        </View>

        {/* Friend Requests List or Empty State */}
        {friendRequests.length > 0 ? (
          <View>
            {friendRequests.map((request, index) => (
              <View key={request._id}>
                <FriendRequestCard
                  request={request}
                  onAccept={handleAcceptFriendRequest}
                  onDecline={handleDeclineFriendRequest}
                />
                {/* Separator Line */}
                {index < friendRequests.length - 1 && (
                  <View
                    style={{
                      height: 0.3,
                      backgroundColor: themeColors.border,
                      marginHorizontal: 16,
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: 20,
            paddingHorizontal: 16
          }}>
            <Feather name="user-check" size={32} color={themeColors.placeholderTextColor} />
            <Text style={{ 
              color: themeColors.placeholderTextColor, 
              fontSize: 14, 
              marginTop: 8,
              textAlign: 'center'
            }}>
              No new requests
            </Text>
          </View>
        )}
      </View>

      {/* Recent Activity Section Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          paddingHorizontal: 16, 
          marginBottom: 16 
        }}>
          <Feather name="bell" size={20} color={themeColors.text} style={{ marginRight: 8 }} />
          <Text style={{ 
            color: themeColors.text, 
            fontSize: 16, 
            fontWeight: 'bold' 
          }}>
            Recent Activity
          </Text>
        </View>
    </View>
  );

  // Render footer component
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={themeColors.tint} />
        </View>
      );
    }
    return null;
  };

  // Render empty component
  const renderEmpty = () => (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingVertical: 60 
    }}>
      <Feather name="bell" size={64} color={themeColors.placeholderTextColor} />
      <Text style={{ 
        color: themeColors.placeholderTextColor, 
        fontSize: 18, 
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '500'
      }}>
        No notifications
      </Text>
      <Text style={{ 
        color: themeColors.placeholderTextColor, 
        fontSize: 14, 
        marginTop: 8,
        textAlign: 'center'
      }}>
        You're all caught up!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            marginTop: 16 
          }}>
            Loading notifications...
          </Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
        data={sortedNotifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item: notification }) => (
          <View>
            <NotificationCard
              notification={notification}
              onPress={() => handleNotificationPress(notification)}
            />
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 0.3,
              backgroundColor: themeColors.border,
              marginHorizontal: 16,
            }}
          />
        )}
        onEndReached={loadMoreNotifications}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </ThemedView>
  );
} 