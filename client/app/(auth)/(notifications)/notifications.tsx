import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { Feather } from '@expo/vector-icons';
import FriendRequestCard from '@/components/FriendRequestCard';
import NotificationCard from '@/components/NotificationCard';
import { useNotifications } from '@/context/UserSessionContext';
import { usePaginatedNotifications } from '@/hooks/useNotificationQueries.comprehensive.new';
import { FriendRequestNotification, NotificationData } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SkeletonBox } from '@/components/Skeleton';

/**
 * Notifications Page - New TanStack Query Implementation
 * 
 * Uses the new notification system with:
 * - Real-time updates via TanStack Query
 * - Optimistic updates for better UX
 * - Automatic cache management
 * - Push notification integration
 */

export default function NotificationsPageV2() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Local state for tracking mark-as-read operations
  const [markingAsViewed, setMarkingAsViewed] = useState<Record<string, boolean>>({});
  
  // Use the new notification system
  const {
    friendRequests,
    notifications: contextNotifications,
    loading: contextLoading,
    handleAcceptFriendRequest,
    handleDeclineFriendRequest,
    markAllNotificationsAsViewed,
    refreshData,
    registerNotificationPageCallback,
    markingAllAsRead,
    acceptingFriendRequest,
    decliningFriendRequest,
  } = useNotifications();

  console.log('🔔 Context notifications:', contextNotifications?.length || 0);
  console.log('🔔 Friend requests:', friendRequests?.length || 0);

  // Use paginated notifications with infinite scroll
  const {
    data: paginatedData,
    isLoading: paginatedLoading,
    isFetching: paginatedRefreshing,
    fetchNextPage,
    hasNextPage,
    refetch: refetchPaginated,
  } = usePaginatedNotifications(1, 5); // Match the old hook's limit

  // Extract notifications from paginated data
  const paginatedNotifications = useMemo(() => {
    console.log('🔔 Paginated data:', paginatedData);
    const notifications = paginatedData?.pages.flatMap(page => page.notifications) || [];
    console.log('🔔 Extracted notifications:', notifications.length);
    return notifications;
  }, [paginatedData]);

  // Register callback for real-time updates
  useEffect(() => {
    const handleBackgroundNotification = (type: string) => {
      console.log('🔔 Background notification received on notifications page:', type);
      
      // The new system automatically invalidates queries, so we just need to
      // refetch paginated data if it's event-related
      if (type && type.includes('event')) {
        refetchPaginated();
      }
    };

    const unregister = registerNotificationPageCallback(handleBackgroundNotification);
    return unregister;
  }, [registerNotificationPageCallback, refetchPaginated]);

  // Mark all notifications as viewed when leaving the screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Mark all as viewed when leaving the page
        if (!contextLoading && !markingAllAsRead) {
          markAllNotificationsAsViewed();
        }
      };
    }, [contextLoading, markingAllAsRead, markAllNotificationsAsViewed])
  );

  // Sort notifications: unread first, then by time
  const sortedNotifications = useMemo(() => {
    return [...paginatedNotifications]
      .filter(notification => notification && notification._id)
      .sort((a, b) => {
        // Unread first
        if (a.is_seen !== b.is_seen) {
          return a.is_seen ? 1 : -1;
        }
        // Then by time (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [paginatedNotifications]);

  // Handle notification press with optimistic updates
  const handleNotificationPress = useCallback(async (notification: NotificationData) => {
    // Prevent multiple actions on same notification
    if (markingAsViewed[notification._id]) return;
    
    // Mark as read if unread (optimistic update happens automatically in the new system)
    if (!notification.is_seen) {
      setMarkingAsViewed(prev => ({ ...prev, [notification._id]: true }));
      
      try {
        // The new system handles optimistic updates automatically
        // This will instantly update the UI and rollback on error
        await markAllNotificationsAsViewed(); // You might want to create a single notification mark method
      } finally {
        setMarkingAsViewed(prev => ({ ...prev, [notification._id]: false }));
      }
    }
    
    // Navigate based on notification type
    if (notification.type === 'friend_request_accepted' || notification.type === 'someone_from_contacts_joined') {
      if (notification.sender?._id) {
        router.push({
          pathname: "/(auth)/profile/[_id]" as const,
          params: { _id: notification.sender._id }
        });
      }
    } else if (notification.event?._id) {
      router.push({
        pathname: "/(auth)/viewEvent/[event_id]" as const,
        params: { event_id: notification.event._id }
      });
    }
  }, [markingAsViewed, markAllNotificationsAsViewed, router]);

  // Handle refresh - refreshes both data sources
  const handleRefresh = useCallback(async () => {
    await Promise.allSettled([
      refetchPaginated(),
      refreshData()
    ]);
  }, [refetchPaginated, refreshData]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !paginatedLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, paginatedLoading, fetchNextPage]);

  // Render functions
  const renderNotificationItem = useCallback(({ item: notification }: { item: NotificationData }) => (
    <NotificationCard
      notification={notification}
      onPress={() => handleNotificationPress(notification)}
      isMarking={!!markingAsViewed[notification._id]}
    />
  ), [handleNotificationPress, markingAsViewed]);

  const renderItemSeparator = useCallback(() => (
    <View style={{ height: 0.3, backgroundColor: 'transparent', marginHorizontal: 16 }} />
  ), []);

  const keyExtractor = useCallback((item: NotificationData, index: number) => 
    `notification-${item._id}-${index}`, []
  );

  // Header with friend requests
  const renderHeader = useCallback(() => (
    <View>
      {friendRequests.length > 0 && (
        <View style={{ marginBottom: 16 }}>
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
            <View style={{
              backgroundColor: '#EF4444',
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 6,
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                {friendRequests.length}
              </Text>
            </View>
          </View>

          {friendRequests.map((request, index) => (
            <View key={request._id}>
              <FriendRequestCard
                request={request}
                onAccept={handleAcceptFriendRequest}
                onDecline={handleDeclineFriendRequest}
                // Show loading states from the new system
                isAccepting={acceptingFriendRequest}
                isDeclining={decliningFriendRequest}
              />
              {index < friendRequests.length - 1 && renderItemSeparator()}
            </View>
          ))}
        </View>
      )}

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
  ), [
    friendRequests, 
    handleAcceptFriendRequest, 
    handleDeclineFriendRequest,
    acceptingFriendRequest,
    decliningFriendRequest,
    themeColors,
    renderItemSeparator
  ]);

  // Footer with load more
  const renderFooter = useCallback(() => {
    if (paginatedLoading) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
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

    if (!hasNextPage && sortedNotifications.length > 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
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
  }, [paginatedLoading, hasNextPage, sortedNotifications.length, themeColors]);

  // Empty state
  const renderEmpty = useCallback(() => {
    if (paginatedLoading && sortedNotifications.length === 0) {
      return (
        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} height={100} width={'100%'} borderRadius={12} />
          ))}
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
  }, [paginatedLoading, sortedNotifications.length, themeColors]);

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
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
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