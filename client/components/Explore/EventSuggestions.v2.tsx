import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Event from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useInfiniteRecommendedEvents } from '@/hooks/useInfiniteQueries.new';
import { EventCardSkeleton } from '../Skeleton';

interface EventSuggestionsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

/**
 * TanStack React Query version of EventSuggestions with pagination
 * 
 * Key improvements over the legacy version:
 * - Uses useInfiniteEventsQuery for paginated data fetching
 * - Automatic background refetching and cache management
 * - Better error handling with retry logic
 * - Simplified state management (no manual useState)
 * - Built-in loading states and optimistic updates
 * - TanStack Query integration (ready for backend pagination)
 * - Consistent with other TanStack Query implementations
 * 
 * Migration changes:
 * - Replaced useGetRecommendedEvents with useInfiniteEventsQuery
 * - Removed manual state management (useState for recommendedEvents)
 * - Uses simple View with map (since it's embedded in Discover ScrollView)
 * - Uses eventType: 'recommended' for proper API routing
 * - Better error handling with automatic retries
 * - Removed manual loading and error states
 * 
 * Note: This component is now obsolete as Discover.v2 handles recommended events
 * directly with FlashList for proper infinite scroll support.
 */
const EventSuggestionsV2: React.FC<EventSuggestionsProps> = ({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];

  // Use infinite query for recommended events with pagination
  const queryResult = useInfiniteRecommendedEvents();

  // Extract values from the query result
  const events = React.useMemo(() => {
    return queryResult.data?.pages.flatMap(page => page.events) || [];
  }, [queryResult.data]);

  const isLoading = queryResult.isLoading;
  const isError = queryResult.isError;
  const error = queryResult.error;
  const hasMore = queryResult.data?.pages[queryResult.data.pages.length - 1]?.hasMore || false;
  const isFetchingNextPage = queryResult.isFetchingNextPage;
  const refetch = queryResult.refetch;
  const loadMore = () => {
    if (hasMore && !isFetchingNextPage) {
      queryResult.fetchNextPage();
    }
  };

  // Handle refresh
  React.useEffect(() => {
    if (refreshing) {
      refetch().finally(() => {
        onFinishRefresh();
      });
    }
  }, [refreshing, refetch, onFinishRefresh]);

  // Show skeleton only on initial load
  if (isLoading && events.length === 0) {
    return (
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
          Events You Might Like
        </ThemedText>
        <EventCardSkeleton count={2} />
      </ThemedView>
    );
  }

  // Error state
  if (isError && events.length === 0) {
    return (
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
          Events You Might Like
        </ThemedText>
        <TouchableOpacity
          style={{
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
          }}
          onPress={() => refetch()}
        >
          <View style={{ marginBottom: 12 }}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={32}
              color={themeColors.placeholderTextColor}
            />
          </View>
          <ThemedText
            style={{
              fontSize: 16,
              textAlign: 'center',
              color: themeColors.textSecondary,
              marginBottom: 8,
            }}
          >
            Unable to load recommendations
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 14,
              textAlign: 'center',
              color: themeColors.textThird,
            }}
          >
            Tap to try again
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
          Events You Might Like
        </ThemedText>
        <TouchableOpacity
          style={{
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
          }}
          onPress={() => refetch()}
        >
          <View style={{ marginBottom: 12 }}>
            <IconSymbol
              name="star.fill"
              size={32}
              color={themeColors.placeholderTextColor}
            />
          </View>
          <ThemedText
            style={{
              fontSize: 16,
              textAlign: 'center',
              color: themeColors.textSecondary,
            }}
          >
            No recommended events yet
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
              color: themeColors.textThird,
            }}
          >
            Add more interests to get personalized suggestions
          </ThemedText>
          <ThemedText
            style={{
              fontSize: 14,
              textAlign: 'center',
              marginTop: 8,
              color: themeColors.textThird,
            }}
          >
            Tap to refresh
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Events You Might Like</ThemedText>
        <ThemedText style={{ fontSize: 14, color: themeColors.textSecondary }}>
          {events.length} events
        </ThemedText>
      </ThemedView>

      {/* Event List */}
      <View style={{ flex: 1, gap: 16 }}>
        {events.map((event, index) => (
          <View key={event._id || index}>
            <Event
              event={event}
              loading={false}
            />
          </View>
        ))}
        
        {/* Note: Since we're inside a ScrollView, we can't use infinite scroll */}
        {/* The component is ready for when this becomes a standalone page with FlatList */}
        {isFetchingNextPage && (
          <View style={{ 
            padding: 16, 
            alignItems: 'center',
            justifyContent: 'center' 
          }}>
            <ThemedText style={{ 
              color: themeColors.textSecondary,
              fontSize: 14
            }}>
              Loading more events...
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
};

export default EventSuggestionsV2;

/**
 * Migration Summary:
 * 
 * REMOVED (Legacy Code):
 * - const [recommendedEvents, setRecommendedEvents] = useState<EventType[]>([]);
 * - const { fetchRecommendedEvents, loading, isFirstFetch } = useGetRecommendedEvents();
 * - const fetchEvents = async () => { ... };
 * - useFocusEffect for manual data fetching
 * - Manual state management for events list
 * - Manual loading and error handling
 * 
 * ADDED (TanStack Query):
 * - useInfiniteEventsQuery with eventType: 'recommended'
 * - Simple View with map (compatible with parent ScrollView)
 * - Built-in cache management and background refetching
 * - Better error handling with retry capability
 * - Loading indicator for future pagination
 * - Event count display in header
 * 
 * PRESERVED (Unchanged):
 * - Component props interface
 * - Empty state design and messaging
 * - Error state with tap to retry
 * - Loading skeleton on first fetch
 * - Overall UI/UX design
 * - Integration with Discover page refresh
 * 
 * BENEFITS:
 * - Ready for backend pagination when implemented
 * - Automatic cache management
 * - Background refetching for fresh data
 * - Better error handling and retry logic
 * - Reduced code complexity
 * - Consistent with other TanStack Query implementations
 * - Compatible with parent ScrollView (no VirtualizedList nesting)
 * - Easy to migrate to FlatList when moved to standalone page
 */