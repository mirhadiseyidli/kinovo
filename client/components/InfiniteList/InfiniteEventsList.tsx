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
  useInfiniteEventsQuery, 
  InfiniteEventsQueryConfig,
  InfiniteEvent as Event 
} from '@/hooks/useInfiniteEventsQuery';
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

interface InfiniteEventsListProps extends InfiniteEventsQueryConfig {
  // List configuration
  useFlashList?: boolean;
  estimatedItemSize?: number;
  
  // Rendering
  renderItem?: (item: Event, index: number) => React.ReactElement | null | undefined;
  renderEmptyState?: () => React.ReactNode;
  renderLoadingState?: () => React.ReactNode;
  renderErrorState?: (error: any, retry: () => void) => React.ReactNode;
  ListHeaderComponent?: () => React.ReactNode;
  
  // List behavior
  onEndReachedThreshold?: number;
  showLoadMoreButton?: boolean;
  loadMoreText?: string;
  
  // Callbacks
  onItemPress?: (item: Event) => void;
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
  event: Event;
  index: number;
  onPress?: (event: Event) => void;
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
  distance,
  userId,
  searchQuery,
  category,
  startDate,
  endDate,
  pageSize = 10,
  enabled = true,
  
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
  
  // Pass through other query options
  ...queryOptions
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Use the infinite query hook
  const {
    events,
    isLoading,
    isFetchingNextPage,
    hasMore,
    error,
    isError,
    loadMore,
    refetch,
    totalCount,
  } = useInfiniteEventsQuery({
    eventType,
    latitude,
    longitude,
    distance,
    userId,
    searchQuery,
    category,
    startDate,
    endDate,
    pageSize,
    enabled,
    ...queryOptions,
  });

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
  const handleItemPress = useCallback((event: Event) => {
    onItemPress?.(event);
  }, [onItemPress]);

  // Render item function with proper typing for both FlatList and FlashList
  const renderEventItem = useCallback((info: { item: Event; index: number }) => {
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
    keyExtractor: (item: Event, index: number) => item._id || `event-${index}`,
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
        <FlashList<Event>
          {...updatedCommonProps}
          renderItem={renderEventItem as FlashListRenderItem<Event>}
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
      <FlatList<Event>
        {...updatedCommonProps}
        renderItem={renderEventItem as RNListRenderItem<Event>}
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