import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useInfiniteFriendsEventsQuery, Event } from '@/hooks/useInfiniteEventsQuery';
import EventComponent from '@/components/Event';
import { SkeletonBox } from '../Skeleton';

/**
 * Friends Events Component with Infinite Query
 * 
 * This component replaces the original FriendsEvents component with:
 * - Infinite query support for better performance
 * - Automatic cache invalidation and background refetching
 * - Smooth loading states and error handling
 * - Proper TypeScript typing
 * - Optimized rendering with React.memo
 */

interface FriendsEventsInfiniteProps {
  refreshing?: boolean;
  onFinishRefresh?: () => void;
  userId?: string;
  maxItems?: number;
  showViewAll?: boolean;
}

const FriendsEventsInfinite: React.FC<FriendsEventsInfiniteProps> = React.memo(({
  refreshing = false,
  onFinishRefresh,
  userId,
  maxItems = 3,
  showViewAll = true,
}) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const router = useRouter();

  // Use infinite query for friends events
  const {
    events: friendsEvents,
    isLoading,
    isFetching,
    error,
    refetch,
    totalCount,
  } = useInfiniteFriendsEventsQuery({
    userId,
    pageSize: maxItems,
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    keepPreviousData: true,
    onSuccess: () => {
      onFinishRefresh?.();
    },
    onError: (error) => {
      console.error('Failed to fetch friends events:', error);
      onFinishRefresh?.();
    },
  });

  // Handle refresh
  React.useEffect(() => {
    if (refreshing) {
      refetch();
    }
  }, [refreshing, refetch]);

  // Navigate to all friends events
  const navigateToAllFriendsEvents = useCallback(() => {
    router.push('/(auth)/friends-events-infinite');
  }, [router]);

  // Custom event renderer with loading state
  const renderEvent = useCallback((event: Event, index: number) => {
    return (
      <View key={`${event._id}-${index}`}>
        <EventComponent 
          event={event} 
          loading={refreshing || isFetching}
        />
      </View>
    );
  }, [refreshing, isFetching]);

  // Show skeleton on initial load
  const showSkeleton = isLoading && !refreshing;

  // Empty state component
  const EmptyState = () => (
    <ThemedView style={{
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
          name="person.2.fill"
          size={32}
          color={themeColors.placeholderTextColor}
        />
      </View>
      <ThemedText style={{
        fontSize: 16,
        color: themeColors.placeholderTextColor,
        textAlign: 'center',
        marginBottom: 4,
        fontWeight: '600'
      }}>
        No friends' events found
      </ThemedText>
      <ThemedText style={{
        fontSize: 14,
        color: themeColors.placeholderTextColor,
        textAlign: 'center',
        opacity: 0.8
      }}>
        Your friends haven't created any events yet
      </ThemedText>
    </ThemedView>
  );

  // Error state component
  const ErrorState = () => (
    <ThemedView style={{
      backgroundColor: themeColors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: themeColors.specialRed,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
    }}>
      <View style={{ marginBottom: 12 }}>
        <IconSymbol
          name="exclamationmark.triangle.fill"
          size={32}
          color={themeColors.specialRed}
        />
      </View>
      <ThemedText style={{
        fontSize: 16,
        color: themeColors.specialRed,
        textAlign: 'center',
        marginBottom: 4,
        fontWeight: '600'
      }}>
        Failed to load friends' events
      </ThemedText>
      <ThemedText style={{
        fontSize: 14,
        color: themeColors.placeholderTextColor,
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: 12,
      }}>
        Please check your connection and try again
      </ThemedText>
      <TouchableOpacity
        style={{
          backgroundColor: themeColors.mountainGreen,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 6,
        }}
        onPress={() => refetch()}
      >
        <ThemedText style={{
          color: '#fff',
          fontSize: 14,
          fontWeight: 'bold',
        }}>
          Try Again
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
          Friends' Events
        </ThemedText>
        {(showViewAll && friendsEvents.length !== 0) && (
          <TouchableOpacity
            style={{
              alignItems: 'center',
              backgroundColor: 'transparent',
              opacity: friendsEvents.length > 0 ? 1 : 0.5,
            }}
            onPress={navigateToAllFriendsEvents}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 16, marginRight: 4 }}>
                View All
              </ThemedText>
              <IconSymbol
                name="chevron.right"
                size={12}
                color={Colors[colorScheme ?? 'dark'].tint}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        {showSkeleton ? (
          <SkeletonBox width={'100%'} height={120} borderRadius={16} />
        ) : error ? (
          <ErrorState />
        ) : friendsEvents.length > 0 ? (
          <View style={{ gap: 16 }}>
            {friendsEvents.slice(0, maxItems).map((event, index) => 
              renderEvent(event, index)
            )}
          </View>
        ) : (
          <EmptyState />
        )}
      </View>

      {/* Debug Info in Development */}
      {__DEV__ && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 8,
          borderRadius: 4,
        }}>
          <ThemedText style={{ color: '#fff', fontSize: 10 }}>
            Events: {friendsEvents.length}
          </ThemedText>
          <ThemedText style={{ color: '#fff', fontSize: 10 }}>
            Total: {totalCount}
          </ThemedText>
          <ThemedText style={{ color: '#fff', fontSize: 10 }}>
            Loading: {isLoading ? 'Yes' : 'No'}
          </ThemedText>
          <ThemedText style={{ color: '#fff', fontSize: 10 }}>
            Error: {error ? 'Yes' : 'No'}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
});

export default FriendsEventsInfinite;