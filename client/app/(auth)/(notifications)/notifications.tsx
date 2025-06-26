import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { usePaginatedNotifications } from '@/hooks/usePaginatedNotifications';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFirebaseUpdate } from '@/hooks/useFirebaseRealtime';
import { EventCardSkeleton, SkeletonBox } from '@/components/Skeleton';

export default function NotificationsPage() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Local state for tracking mark-as-viewed operations
  const [markingAsViewed, setMarkingAsViewed] = useState<Record<string, boolean>>({});
  
  // Stable refs to prevent infinite loops
  const hasMarkedFriendRequestsRef = useRef(false);
  
  // Use NotificationContext for friend requests and overall notifications management
  const {
    friendRequests,
    loading: contextLoading,
    firebaseLoading,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markAllNotificationsAsViewed,
    markFriendRequestsAsViewed,
    markFirebaseNotificationAsRead,
  } = useNotifications();

  // Use paginated notifications hook for the main notifications list
  const {
    notifications: paginatedNotifications,
    loading: paginatedLoading,
    refreshing: paginatedRefreshing,
    loadingMore,
    hasMoreData,
    error,
    loadInitialNotifications,
    loadMoreNotifications,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead: markAllPaginatedAsRead
  } = usePaginatedNotifications(5);

  // Load initial notifications when component mounts
  useEffect(() => {
    loadInitialNotifications();
  }, [loadInitialNotifications]);

  // Mark notifications as viewed only when leaving the screen, not when arriving
  useFocusEffect(
    React.useCallback(() => {
      // Mark friend requests as viewed when user views this screen (for Firebase cleanup)
      // Only do this once per screen visit to avoid loops
      if (!contextLoading && !firebaseLoading && friendRequests.length > 0 && !hasMarkedFriendRequestsRef.current) {
        hasMarkedFriendRequestsRef.current = true;
        markFriendRequestsAsViewed();
      }
      
      // Only mark notifications as viewed when LEAVING the screen
      return () => {
        hasMarkedFriendRequestsRef.current = false; // Reset for next visit
        if (!contextLoading && !firebaseLoading) {
          // Mark both context notifications and paginated notifications as read
          markAllNotificationsAsViewed();
          markAllPaginatedAsRead();
        }
      };
    }, [contextLoading, firebaseLoading, friendRequests.length, markAllNotificationsAsViewed, markFriendRequestsAsViewed, markAllPaginatedAsRead])
  );

  // Sort notifications: unread first, then read, all sorted by time (newest first)
  // Friend request notifications are no longer created - they only exist in Friend Requests section
  const sortedNotifications = useMemo(() => {
    // Filter out invalid notifications first
    const validNotifications = paginatedNotifications.filter(notification => 
      notification && notification._id && typeof notification._id === 'string'
    );
    
    return validNotifications
      .filter(notification => {
        // Exclude any remaining friend_request type notifications (should not exist)
        return notification.type !== 'friend_request';
      })
      .sort((a, b) => {
        // First sort by read status (unread first)
        if (a.is_seen !== b.is_seen) {
          return a.is_seen ? 1 : -1;
        }
        // Then sort by time (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [paginatedNotifications]);

  // Separate unread and read notifications
  const unreadNotifications = useMemo(() => 
    sortedNotifications.filter(n => !n.is_seen), [sortedNotifications]
  );
  
  const readNotifications = useMemo(() => 
    sortedNotifications.filter(n => n.is_seen), [sortedNotifications]
  );

  const handleNotificationPress = useCallback(async (notification: NotificationData) => {
    // Prevent multiple simultaneous actions on the same notification
    if (markingAsViewed[notification._id]) return;
    
    // Only mark as read if it's currently unread
    if (!notification.is_seen) {
      // Set local loading state
      setMarkingAsViewed(prev => ({ ...prev, [notification._id]: true }));
      
      try {
        // Mark as viewed in both systems
        await Promise.all([
          markNotificationAsRead(notification._id),
          markFirebaseNotificationAsRead && markFirebaseNotificationAsRead(notification._id)
        ]);
      } finally {
        // Clear loading state
        setMarkingAsViewed(prev => ({ ...prev, [notification._id]: false }));
      }
    }
    
    // Always navigate regardless of read/unread status
    if (notification.type === 'friend_request_accepted') {
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
  }, [markNotificationAsRead, markFirebaseNotificationAsRead, router, markingAsViewed]);

  const handleRefresh = useCallback(async () => {
    await refreshNotifications();
  }, [refreshNotifications]);

  const handleLoadMore = useCallback(() => {
    if (hasMoreData && !loadingMore && !paginatedLoading) {
      loadMoreNotifications();
    }
  }, [hasMoreData, loadingMore, paginatedLoading, loadMoreNotifications]);

  // Memoized render functions for better performance
  const renderNotificationItem = useCallback(({ item: notification }: { item: NotificationData }) => (
    <NotificationCard
      notification={notification}
      onPress={() => handleNotificationPress(notification)}
      isMarking={!!markingAsViewed[notification._id]}
    />
  ), [handleNotificationPress, markingAsViewed]);

  const renderItemSeparator = useCallback(() => (
    <View
      style={{
        height: 0.3,
        backgroundColor: themeColors.border,
        marginHorizontal: 16,
      }}
    />
  ), [themeColors.border]);

  const keyExtractor = useCallback((item: NotificationData, index: number) => `notification-${item._id}-${index}`, []);

  // Render header component
  const renderHeader = useCallback(() => (
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
            backgroundColor: themeColors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: themeColors.border,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            marginHorizontal: 16
          }}>
            <View style={{ marginBottom: 12 }}>
              <Feather name="user-check" size={32} color={themeColors.placeholderTextColor} />
            </View>
            <Text style={{ 
              color: themeColors.placeholderTextColor,
              fontSize: 16, 
              textAlign: 'center',
              marginBottom: 4,
              fontWeight: '600'
            }}>
              No friend requests
            </Text>
            <Text style={{ 
              color: themeColors.placeholderTextColor, 
              fontSize: 14, 
              textAlign: 'center',
              opacity: 0.8
            }}>
              No new requests at this time
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
  ), [friendRequests.length, handleAcceptFriendRequest, handleDeclineFriendRequest, themeColors.background, themeColors.border, themeColors.text]);

  // Render footer component
  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={{ 
          paddingVertical: 20, 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ActivityIndicator size="small" color={themeColors.tint} />
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            marginTop: 8,
            fontSize: 14
          }}>
            Loading more notifications...
          </Text>
        </View>
      );
    }

    if (!hasMoreData && sortedNotifications.length > 0) {
      return (
        <View style={{ 
          paddingVertical: 20, 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            fontSize: 14,
            opacity: 0.7
          }}>
            You've reached the end
          </Text>
        </View>
      );
    }

    return null;
  }, [loadingMore, hasMoreData, sortedNotifications.length, themeColors.tint, themeColors.placeholderTextColor]);

  // Render empty component
  const renderEmpty = useCallback(() => {
    if (paginatedLoading) {
      return (
        <View style={{ 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
          marginHorizontal: 16
        }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ 
            color: themeColors.placeholderTextColor, 
            marginTop: 16 
          }}>
            Loading notifications...
          </Text>
        </View>
      );
    }

    return (
      <View style={{ 
        backgroundColor: themeColors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: themeColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        marginHorizontal: 16
      }}>
        <View style={{ marginBottom: 12 }}>
          <Feather name="bell" size={32} color={themeColors.placeholderTextColor} />
        </View>
        <Text style={{ 
          color: themeColors.placeholderTextColor,
          fontSize: 16, 
          textAlign: 'center',
          marginBottom: 4,
          fontWeight: '600'
        }}>
          No notifications
        </Text>
        <Text style={{ 
          color: themeColors.placeholderTextColor, 
          fontSize: 14, 
          textAlign: 'center',
          opacity: 0.8
        }}>
          You're all caught up!
        </Text>
      </View>
    );
  }, [paginatedLoading, themeColors.tint, themeColors.placeholderTextColor, themeColors.background, themeColors.border]);

  // if (contextLoading || firebaseLoading) {
  //   return (
  //     <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
  //       <EventCardSkeleton count={3} />
  //     </ThemedView>
  //   );
  // }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl 
            refreshing={paginatedRefreshing} 
            onRefresh={handleRefresh}
            tintColor={themeColors.mountainGreen}
            colors={[themeColors.mountainGreen]}
          />
        }
        showsVerticalScrollIndicator={false}
        data={sortedNotifications}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        keyExtractor={keyExtractor}
        renderItem={renderNotificationItem}
        ItemSeparatorComponent={renderItemSeparator}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </ThemedView>
  );
} 