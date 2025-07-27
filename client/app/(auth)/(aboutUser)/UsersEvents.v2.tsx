import React, { useState, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { useUserEventsInfiniteQuery, useCanViewUserEvents } from '@/hooks/useUserEventsQuery';
import SearchFriendsBar from '@/components/SearchFriendsBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventView from '@/components/Event';
import { Feather } from '@expo/vector-icons';
import { TabFlashList } from '@/components/CollapsibleTab/tab-flash-list';
import { Route } from '@/components/CollapsibleTab';
import { SkeletonBox, EventCardSkeleton } from '@/components/Skeleton';
import { Event } from '@/types/allTypes';
import PastEvent from '@/components/Home/PastEvent';

/**
 * UsersEvents.v2 - TanStack Query-based User Events Component
 * 
 * This component replaces the original UsersEvents with:
 * - TanStack Query infinite scroll pagination
 * - Privacy-aware event filtering
 * - Superior caching and performance
 * - Backward compatible UI/UX
 */

type UserEventsProps = {
  userId: string;
  route?: Route;
  refreshing?: boolean;
};

const EventSkeleton = () => {
  return (
    <View style={{ marginBottom: 16 }}>
      <EventCardSkeleton />
    </View>
  );
};

export default React.memo(function UserEvents({ userId, route, refreshing }: UserEventsProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  // Use TanStack Query for user events with infinite scroll
  const {
    events: eventsList,
    loading,
    refreshing: queryRefreshing,
    hasMore,
    loadMore,
    isLoadingMore,
    refetch,
    error
  } = useUserEventsInfiniteQuery(userId, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Check privacy permissions
  const { canView, relationship, isOwner } = useCanViewUserEvents(userId);

  // Handle external refresh
  React.useEffect(() => {
    if (refreshing) {
      refetch();
    }
  }, [refreshing, refetch]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return eventsList
      .filter(event => 
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });
  }, [eventsList, searchQuery]);

  const renderItem = ({ item }: { item: Event }) => {
    return (
      <View style={{ marginBottom: 16 }}>
        <PastEvent key={item._id} event={item} loading={false} /> 
        {/* <EventView key={item._id} event={item} loading={false} /> */}
      </View>
    );
  };

  // Handle load more on scroll
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !loading) {
      loadMore();
    }
  };

  const ListEmptyComponent = () => {
    // Show different messages based on permissions and loading state
    if (loading) {
      return null; // Show skeleton instead
    }

    if (!canView && !isOwner) {
      return (
        <View style={{ paddingTop: 16, width: '100%' }}>
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
              <Feather
                name="lock"
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
              Private Events
            </ThemedText>
            <ThemedText 
              style={{ 
                fontSize: 14, 
                color: themeColors.placeholderTextColor,
                textAlign: 'center',
                opacity: 0.8
              }}
            >
              This user's events are private
            </ThemedText>
          </View>
        </View>
      );
    }

    return (
      <View style={{ paddingTop: 16, width: '100%' }}>
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
            <Feather
              name="calendar"
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
            No events yet
          </ThemedText>
          <ThemedText 
            style={{ 
              fontSize: 14, 
              color: themeColors.placeholderTextColor,
              textAlign: 'center',
              opacity: 0.8
            }}
          >
            {isOwner 
              ? "Your events will appear here once you've created or joined any"
              : "User's events will appear here once they've attended any"
            }
          </ThemedText>
        </View>
      </View>
    );
  };

  const ListHeaderComponent = () => {
    // Show skeleton on first load
    if (loading && eventsList.length === 0) {
      return (
        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <SkeletonBox width="100%" height={40} borderRadius={8} marginBottom={16} />
          <EventSkeleton />
          <EventSkeleton />
        </View>
      );
    }

    // Show search bar if there are events
    if (eventsList.length > 0) {
      return (
        <View style={{ marginTop: 16, marginBottom: 16, width: '100%' }}>
          <SearchFriendsBar
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      );
    }

    return null;
  };

  const ListFooterComponent = () => {
    if (isLoadingMore) {
      return (
        <View style={{ 
          paddingVertical: 20, 
          alignItems: 'center' 
        }}>
          <ActivityIndicator 
            size="small" 
            color={themeColors.mountainGreen} 
          />
          <ThemedText style={{ 
            marginTop: 8, 
            color: themeColors.placeholderTextColor,
            fontSize: 12
          }}>
            Loading more events...
          </ThemedText>
        </View>
      );
    }

    if (!hasMore && eventsList.length > 0) {
      return (
        <View style={{ 
          paddingVertical: 20, 
          alignItems: 'center' 
        }}>
          <ThemedText style={{ 
            color: themeColors.placeholderTextColor,
            fontSize: 12
          }}>
            No more events to load
          </ThemedText>
        </View>
      );
    }

    return null;
  };

  // Show error state if needed
  if (error && eventsList.length === 0) {
    return (
      <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Feather
            name="alert-circle"
            size={48}
            color={themeColors.placeholderTextColor}
          />
          <ThemedText style={{
            marginTop: 16,
            fontSize: 16,
            color: themeColors.placeholderTextColor,
            textAlign: 'center'
          }}>
            Failed to load events
          </ThemedText>
          <ThemedText style={{
            marginTop: 8,
            fontSize: 14,
            color: themeColors.placeholderTextColor,
            textAlign: 'center',
            opacity: 0.8
          }}>
            Please try again later
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
      <TabFlashList
        index={route?.index || 0}
        data={filteredEvents}
        estimatedItemSize={200}
        renderItem={renderItem}
        ListEmptyComponent={ListEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        // refreshing={queryRefreshing}
        // onRefresh={refetch}
      />
    </ThemedView>
  );
});