import React, { useMemo, useCallback, useEffect } from 'react';
import { 
  FlatList, 
  RefreshControl, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ListRenderItem as RNListRenderItem,
  ViewToken
} from 'react-native';
import { FlashList, ListRenderItem as FlashListRenderItem } from '@shopify/flash-list';
import { 
  useInfiniteAttentionRequiredEvents,
  useInfiniteUpcomingEvents,
  useInfinitePastEvents,
  useInfiniteNearbyEvents,
  useInfiniteFriendsEvents,
  useInfiniteRecommendedEvents,
  useInfiniteUserEvents,
  useInfiniteSearchEvents
} from '@/hooks/useInfiniteQueries.new';
import { useInfiniteEventsQuery, InfiniteEvent, Event as InfiniteQueryEvent } from '@/hooks/useInfiniteEventsQuery';
import { Event } from '@/types/allTypes';

// Use the main Event type which already has all required properties
export type UnifiedEvent = Event;
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedText } from '@/components/ThemedText';


/**
 * Infinite Events List Component
 * 
 * A comprehensive infinite scroll list component for events with:
 * - Infinite scroll with automatic loading
 * - Pull-to-refresh functionality
 * - Smooth loading states and transitions
 * - Performance optimizations with FlashList
 * - Customizable item rendering
 * - Error handling and retry mechanisms
 */

interface InfiniteEventsListProps {
  // Event type and configuration
  eventType: 'attention-required' | 'upcoming' | 'past' | 'nearby' | 'friends' | 'recommended' | 'user' | 'search' | 'category' | 'city';
  
  // Query parameters
  userId?: string;
  targetUserId?: string; // For user events
  searchQuery?: string; // For search events
  category?: string; // For search events with category filter or category events
  city?: string; // For city events
  latitude?: number; // For nearby events
  longitude?: number; // For nearby events
  distance?: number; // For nearby events
  pageSize?: number;
  enabled?: boolean;
  
  // Query behavior options
  enableSmooth?: boolean;
  keepPreviousData?: boolean;
  staleTime?: number;
  gcTime?: number;
  // List configuration
  useFlashList?: boolean;
  estimatedItemSize?: number;
  
  // Rendering
  renderItem?: (item: UnifiedEvent, index: number) => React.ReactElement | null | undefined;
  renderEmptyState?: () => React.ReactNode;
  renderLoadingState?: () => React.ReactNode;
  renderErrorState?: (error: any, retry: () => void) => React.ReactNode;
  ListHeaderComponent?: () => React.ReactNode;
  
  // List behavior
  onEndReachedThreshold?: number;
  showLoadMoreButton?: boolean;
  loadMoreText?: string;
  
  // Callbacks
  onItemPress?: (item: UnifiedEvent) => void;
  onRefresh?: () => void;
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  
  // Styling
  containerStyle?: any;
  contentContainerStyle?: any;
  itemSeparatorStyle?: any;
  
  // Accessibility
  testID?: string;
}

// Default event item renderer
const DefaultEventItem: React.FC<{
  event: UnifiedEvent;
  index: number;
  onPress?: (event: UnifiedEvent) => void;
  colorScheme: 'light' | 'dark';
}> = ({ event, index, onPress, colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors.background,
        padding: 16,
        borderRadius: 8,
        marginVertical: 4,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
      onPress={() => onPress?.(event)}
      testID={`event-item-${index}`}
    >
      <Text style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
      }}>
        {event.title}
      </Text>
      
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
      }}>
        {event.location.text}
      </Text>
      
      <Text style={{
        fontSize: 12,
        color: colors.textSecondary,
      }}>
        {new Date(event.start_time as Date).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );
};

// Default empty state
const DefaultEmptyState: React.FC<{ colorScheme: 'light' | 'dark' }> = ({ colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    }}>
      <Text style={{
        fontSize: 18,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
      }}>
        No events found
      </Text>
      <Text style={{
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Try adjusting your filters or check back later
      </Text>
    </View>
  );
};

// Default loading state
const DefaultLoadingState: React.FC<{ colorScheme: 'light' | 'dark' }> = ({ colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    }}>
      <ActivityIndicator size="large" color={colors.mountainGreen} />
      <Text style={{
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
      }}>
        Loading events...
      </Text>
    </View>
  );
};

// Default error state
const DefaultErrorState: React.FC<{
  error: any;
  retry: () => void;
  colorScheme: 'light' | 'dark';
}> = ({ error, retry, colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <View style={{ paddingHorizontal: 16 }}>
        {/* Error State */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.background,
            borderRadius: 12,
            padding: 16,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.border,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
            marginTop: 8,
          }}
        >
          <View style={{ marginBottom: 12 }}>
            <IconSymbol
              name="calendar"
              size={32}
              color={colors.placeholderTextColor}
            />
          </View>
          <ThemedText 
            style={{ 
              fontSize: 16, 
              color: colors.placeholderTextColor,
              textAlign: 'center',
              marginBottom: 4,
              fontWeight: '600'
            }}
          >
            Unable to load events
          </ThemedText>
          <ThemedText 
            style={{ 
              fontSize: 14, 
              color: colors.placeholderTextColor,
              textAlign: 'center',
              opacity: 0.8
            }}
          >
            Pull to refresh or check your connection
          </ThemedText>
        </TouchableOpacity>
      </View>
  );
};

// Loading more indicator
const LoadingMoreIndicator: React.FC<{ colorScheme: 'light' | 'dark' }> = ({ colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <View style={{
      paddingVertical: 20,
      alignItems: 'center',
    }}>
      <ActivityIndicator size="small" color={colors.mountainGreen} />
      <Text style={{
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 8,
      }}>
        Loading more events...
      </Text>
    </View>
  );
};

// Load more button
const LoadMoreButton: React.FC<{
  onPress: () => void;
  text: string;
  loading: boolean;
  colorScheme: 'light' | 'dark';
}> = ({ onPress, text, loading, colorScheme }) => {
  const colors = Colors[colorScheme];
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors.background,
        marginHorizontal: 16,
        marginVertical: 10,
        paddingVertical: 12,
        borderRadius: 6,
        alignItems: 'center',
        opacity: loading ? 0.7 : 1,
      }}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.mountainGreen} />
      ) : (
        <Text style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: 'bold',
        }}>
          {text}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const InfiniteEventsList: React.FC<InfiniteEventsListProps> = ({
  // Query configuration
  eventType,
  latitude,
  longitude,
  distance = 10,
  userId,
  targetUserId,
  searchQuery,
  category,
  city,
  pageSize = 10,
  enabled = true,
  
  // Query behavior options
  enableSmooth = true,
  keepPreviousData = true,
  staleTime,
  gcTime,
  
  // List configuration
  useFlashList = true,
  estimatedItemSize = 100,
  
  // Rendering
  renderItem,
  renderEmptyState,
  renderLoadingState,
  renderErrorState,
  ListHeaderComponent,
  
  // List behavior
  onEndReachedThreshold = 0.5,
  showLoadMoreButton = false,
  loadMoreText = 'Load More',
  
  // Callbacks
  onItemPress,
  onRefresh,
  onViewableItemsChanged,
  
  // Styling
  containerStyle,
  contentContainerStyle,
  itemSeparatorStyle,
  
  // Accessibility
  testID = 'infinite-events-list',
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Use the appropriate infinite query hook based on event type
  const getQueryHook = () => {
    const hookOptions = {
      pageSize,
      enabled,
      staleTime,
      gcTime,
      keepPreviousData
    };

    switch (eventType) {
      case 'attention-required':
        return useInfiniteAttentionRequiredEvents();
      case 'upcoming':
        return useInfiniteUpcomingEvents();
      case 'past':
        return useInfinitePastEvents();
      case 'nearby':
        if (latitude !== undefined && longitude !== undefined) {
          return useInfiniteNearbyEvents(latitude, longitude, distance);
        }
        throw new Error('Nearby events require latitude and longitude');
      case 'friends':
        return useInfiniteFriendsEvents(hookOptions);
      case 'recommended':
        return useInfiniteRecommendedEvents();
      case 'user':
        if (targetUserId) {
          return useInfiniteUserEvents(targetUserId);
        }
        throw new Error('User events require targetUserId');
      case 'search':
        if (searchQuery) {
          return useInfiniteSearchEvents(searchQuery, category);
        }
        throw new Error('Search events require searchQuery');
      case 'category':
        if (category) {
          return useInfiniteEventsQuery({
            eventType: 'category',
            category,
            pageSize,
            enabled,
            staleTime,
            gcTime,
            keepPreviousData
          });
        }
        throw new Error('Category events require category');
      case 'city':
        if (city) {
          return useInfiniteEventsQuery({
            eventType: 'city',
            city,
            pageSize,
            enabled,
            staleTime,
            gcTime,
            keepPreviousData
          });
        }
        throw new Error('City events require city');
      default:
        throw new Error(`Unsupported event type: ${eventType}`);
    }
  };

  const queryResult = getQueryHook();
  
  // Extract values from the query result and flatten events
  const events = React.useMemo((): UnifiedEvent[] => {
    let flatEvents: (Event | InfiniteQueryEvent)[] = [];
    
    // Check if this is the comprehensive hook result (has events property)
    if ('events' in queryResult) {
      flatEvents = queryResult.events || [];
    } else {
      // Otherwise use the pages structure from individual hooks
      flatEvents = queryResult.data?.pages.flatMap(page => page.events) || [];
    }
    
    // Apply smooth filtering if enabled
    if (enableSmooth) {
      // Filter out events without creators for friends events
      if (eventType === 'friends') {
        flatEvents = flatEvents.filter(event => {
          if (!event || !event.creator) {
            console.warn('Friends event missing creator:', event);
            return false;
          }
          return true;
        });
      }
    }
    
    // Ensure all events conform to the full Event type
    return flatEvents.map(event => ({
      ...event,
      // Ensure required properties are present with defaults
      _id: event._id || `temp-${Date.now()}-${Math.random()}`,
      creator: event.creator || {
        _id: 'unknown-user',
        first_name: 'Unknown',
        last_name: 'User',
        full_name: 'Unknown User',
        username: 'unknown',
        email: 'unknown@example.com',
        email_verified: false,
        phone_number: { country_code: null, area_code: null, phone_num: null, full_num: null },
        created_at: new Date(),
        mutualFriendsCount: 0
      },
      userStatus: ('userStatus' in event ? event.userStatus : null) as 'pending' | 'maybe' | 'accepted' | 'rejected' | null,
      isUserAttending: 'isUserAttending' in event ? event.isUserAttending : false,
      isUserInvited: 'isUserInvited' in event ? event.isUserInvited : false,
      isUserCreator: 'isUserCreator' in event ? event.isUserCreator : false,
      isFriendEvent: 'isFriendEvent' in event ? event.isFriendEvent : false,
    })) as UnifiedEvent[];
  }, [queryResult, enableSmooth, eventType]);

  const totalCount = React.useMemo(() => {
    // Check if this is the comprehensive hook result (has totalCount property)
    if ('totalCount' in queryResult) {
      return queryResult.totalCount || 0;
    }
    return queryResult.data?.pages[0]?.totalCount || 0;
  }, [queryResult]);

  const hasMore = React.useMemo(() => {
    // Check if this is the comprehensive hook result (has hasMore property)
    if ('hasMore' in queryResult) {
      return queryResult.hasMore || false;
    }
    return queryResult.data?.pages[queryResult.data.pages.length - 1]?.hasMore || false;
  }, [queryResult]);

  const isLoading = queryResult.isLoading;
  const isFetchingNextPage = queryResult.isFetchingNextPage;
  const error = queryResult.error;
  const isError = queryResult.isError;
  const refetch = queryResult.refetch;
  const loadMore = () => {
    if (hasMore && !isFetchingNextPage) {
      // Check if this is the comprehensive hook result (has loadMore method)
      if ('loadMore' in queryResult && queryResult.loadMore) {
        queryResult.loadMore();
      } else if ('fetchNextPage' in queryResult && queryResult.fetchNextPage) {
        queryResult.fetchNextPage();
      }
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    refetch();
  }, [onRefresh, refetch]);

  // Handle end reached
  const handleEndReached = useCallback(() => {
    if (!showLoadMoreButton && hasMore && !isFetchingNextPage) {
      loadMore();
    }
  }, [showLoadMoreButton, hasMore, isFetchingNextPage, loadMore]);

  // Handle load more button
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isFetchingNextPage) {
      loadMore();
    }
  }, [hasMore, isFetchingNextPage, loadMore]);

  // Handle item press
  const handleItemPress = useCallback((event: UnifiedEvent) => {
    onItemPress?.(event);
  }, [onItemPress]);

  // Render item function with proper typing for both FlatList and FlashList
  const renderEventItem = useCallback((info: { item: UnifiedEvent; index: number }) => {
    const { item, index } = info;
    
    if (renderItem) {
      const result = renderItem(item, index);
      // Ensure we never return null/undefined for type compatibility
      if (result === null || result === undefined) {
        return <View />;
      }
      return result;
    }
    
    return (
      <DefaultEventItem
        event={item}
        index={index}
        onPress={handleItemPress}
        colorScheme={colorScheme ?? 'light'}
      />
    );
  }, [renderItem, handleItemPress, colorScheme]);

  // Item separator
  const renderItemSeparator = useCallback(() => {
    if (itemSeparatorStyle) {
      return <View style={itemSeparatorStyle} />;
    }
    return null;
  }, [itemSeparatorStyle]);

  // Footer component
  const renderFooter = useCallback(() => {
    if (showLoadMoreButton && hasMore) {
      return (
        <LoadMoreButton
          onPress={handleLoadMore}
          text={loadMoreText}
          loading={isFetchingNextPage}
          colorScheme={colorScheme ?? 'light'}
        />
      );
    }
    
    if (isFetchingNextPage) {
      return <LoadingMoreIndicator colorScheme={colorScheme ?? 'light'} />;
    }
    
    if (!hasMore && events.length > 0) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: 'center',
          }}>
            No more events to load
          </Text>
          {totalCount > 0 && (
            <Text style={{
              fontSize: 10,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 4,
            }}>
              Showing {events.length} of {totalCount} events
            </Text>
          )}
        </View>
      );
    }
    
    return null;
  }, [
    showLoadMoreButton,
    hasMore,
    isFetchingNextPage,
    events.length,
    totalCount,
    handleLoadMore,
    loadMoreText,
    colorScheme,
    colors,
  ]);

  // Common list props
  const commonProps = {
    data: events,
    keyExtractor: (item: UnifiedEvent, index: number) => item._id || `event-${index}`,
    onEndReached: handleEndReached,
    onEndReachedThreshold,
    onViewableItemsChanged,
    refreshControl: (
      <RefreshControl
        refreshing={false}
        onRefresh={handleRefresh}
        colors={[colors.mountainGreen]}
        tintColor={colors.mountainGreen}
      />
    ),
    ItemSeparatorComponent: renderItemSeparator,
    ListFooterComponent: renderFooter,
    ListHeaderComponent,
    testID,
  };
  
  // Merge content container styles - MUST be before any conditional returns
  const mergedContentContainerStyle = useMemo(() => {
    return {
      flexGrow: 1,
      ...(contentContainerStyle || {}),
    };
  }, [contentContainerStyle]);

  // Determine what to show as ListEmptyComponent based on state
  const renderListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return renderLoadingState 
        ? renderLoadingState()
        : <DefaultLoadingState colorScheme={colorScheme ?? 'light'} />;
    }
    
    if (isError) {
      return renderErrorState 
        ? renderErrorState(error, refetch)
        : <DefaultErrorState error={error} retry={refetch} colorScheme={colorScheme ?? 'light'} />;
    }
    
    // Empty state (no events)
    return renderEmptyState 
      ? renderEmptyState()
      : <DefaultEmptyState colorScheme={colorScheme ?? 'light'} />;
  }, [isLoading, isError, error, renderLoadingState, renderErrorState, renderEmptyState, refetch, colorScheme]);

  // Update commonProps to include ListEmptyComponent
  const updatedCommonProps = {
    ...commonProps,
    ListEmptyComponent: renderListEmptyComponent,
  };

  // Use FlashList or FlatList based on configuration
  if (useFlashList) {
    return (
      <View style={[{ flex: 1 }, containerStyle]}>
        <FlashList<UnifiedEvent>
          {...updatedCommonProps}
          renderItem={renderEventItem as FlashListRenderItem<UnifiedEvent>}
          estimatedItemSize={estimatedItemSize}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
          contentContainerStyle={mergedContentContainerStyle}
        />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, containerStyle]}>
      <FlatList<UnifiedEvent>
        {...updatedCommonProps}
        renderItem={renderEventItem as RNListRenderItem<UnifiedEvent>}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        contentContainerStyle={mergedContentContainerStyle}
      />
    </View>
  );

};

export default InfiniteEventsList;