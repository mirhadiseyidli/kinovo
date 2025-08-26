import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/IconSymbol';
import AttentionRequiredCard from '@/components/Home/AttentionRequired.v2';
import { InfiniteEventsList } from '@/components/InfiniteList/InfiniteEventsList';
import { useInfiniteAttentionRequiredEvents } from '@/hooks/useInfiniteEvents';
import { useAuthSession } from '@/components/Auth/AuthProvider';
import { HomeErrorProvider } from '@/context/HomeErrorContext';
import type { Event } from '@/types/allTypes';

/**
 * NEW Simplified TanStack React Query version of AttentionRequired stack page
 * 
 * Key improvements over the old implementation:
 * - Uses new useInfiniteAttentionRequiredEvents hook with simplified architecture
 * - Direct cache updates instead of invalidations
 * - Single event store with tagging system
 * - Better performance through unified caching
 * - Simplified query key management
 * 
 * Migration changes from old useInfiniteEventsQuery:
 * - Replaced useInfiniteEventsQuery with useInfiniteAttentionRequiredEvents
 * - Updated data extraction to use pages.flatMap pattern
 * - Aligned with new simplified TanStack Query architecture
 * - Benefits from single event store and direct cache updates
 * - Uses InfiniteEventsList component for consistent UX
 * - Custom renderItem function for AttentionRequiredCard integration
 */

export default function AttentionRequiredScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuthSession();

  // Get event count for the header - using the new simplified hook
  const attentionEventsQuery = useInfiniteAttentionRequiredEvents(10, false);

  // Extract data from the new hook structure
  const events = React.useMemo(() => {
    return attentionEventsQuery.data?.pages.flatMap(page => page.events) || [];
  }, [attentionEventsQuery.data]);

  const totalCount = attentionEventsQuery.data?.pages?.[0]?.totalCount || 0;
  const isFetchingNextPage = attentionEventsQuery.isFetchingNextPage;

  // Filter out past events for the count (same logic as renderItem)
  const futureEventsCount = React.useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      const eventStartDate = event.start_time ? new Date(event.start_time) : null;
      return eventStartDate && now < eventStartDate;
    }).length;
  }, [events]);

  // Custom render function for attention required events
  const renderAttentionRequiredItem = React.useCallback((event: Event, index: number) => {
    // Filter out past events (same logic as the component)
    const now = new Date();
    const eventStartDate = event.start_time ? new Date(event.start_time) : null;
    const isFutureEvent = eventStartDate && now < eventStartDate;
    
    // Don't render past events
    if (!isFutureEvent) return null;

    // Ensure event has required user relationship properties for compatibility
    const eventWithDefaults: Event = {
      ...event,
      isUserAttending: event.isUserAttending ?? false,
      isUserInvited: event.isUserInvited ?? true, // Most attention-required events are invitations
      isUserCreator: event.isUserCreator ?? false,
      isFriendEvent: event.isFriendEvent ?? false,
    };

    return (
      <AttentionRequiredCard
        key={event._id}
        refreshing={false}
        onFinishRefresh={() => {}}
        initialEvents={[eventWithDefaults]}
        showHeader={false}
        isHomeScreen={false}
      />
    );
  }, []);

  // Custom empty state for attention required events
  const renderEmptyState = React.useCallback(() => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 16,
    }}>
      <View style={{
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: themeColors.border,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 300,
      }}>
        <View style={{ marginBottom: 12 }}>
          <IconSymbol
            name="checkmark.circle"
            size={32}
            color={themeColors.placeholderTextColor}
          />
        </View>
        <ThemedText style={{ 
          fontSize: 16, 
          textAlign: 'center',
          color: themeColors.textSecondary,
          marginBottom: 8,
          fontWeight: '600'
        }}>
          All caught up!
        </ThemedText>
        <ThemedText style={{ 
          fontSize: 14, 
          textAlign: 'center',
          color: themeColors.textThird,
        }}>
          No events need your attention right now
        </ThemedText>
      </View>
    </View>
  ), [themeColors]);

  // Custom error state
  const renderErrorState = React.useCallback((error: any, retry: () => void) => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    }}>
      <View style={{
        backgroundColor: themeColors.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ff6b6b',
        width: '100%',
        maxWidth: 300,
        alignItems: 'center',
      }}>
        <ThemedText style={{ 
          color: '#ff6b6b',
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          Unable to load attention required events
        </ThemedText>
        <ThemedText style={{ 
          color: themeColors.text,
          fontSize: 14,
          opacity: 0.8,
          marginBottom: 12,
          textAlign: 'center'
        }}>
          {error?.message || 'Something went wrong while loading your attention required events.'}
        </ThemedText>
        <TouchableOpacity
          onPress={retry}
          style={{
            backgroundColor: themeColors.mountainGreen,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <ThemedText style={{ 
            color: themeColors.text,
            fontSize: 14,
            fontWeight: '600'
          }}>
            Try Again
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  ), [themeColors]);

  // Create header component that will be part of the scrollable content
  const renderListHeader = React.useCallback(() => (
    <View style={{ marginBottom: 16 }}>
      {/* Header Card */}
      <ThemedView 
        style={{ 
          backgroundColor: themeColors.maybeStatusColor, // Using the pending color
          padding: 16,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: 16,
          marginBottom: 16,
        }}
      >
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <MaterialCommunityIcons 
            name="clock-alert" 
            size={48} 
            color="white" 
            style={{ marginBottom: 8 }}
          />
          <ThemedText style={{ 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: 4,
            textAlign: 'center'
          }}>
            Events Needing Response
          </ThemedText>
        </View>
      </ThemedView>

      {/* Events Section Header */}
      <ThemedView style={{
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>
          Attention Required
        </ThemedText>
        
        {/* Show event count with loading indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isFetchingNextPage && (
            <View style={{
              backgroundColor: themeColors.tint,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 8,
            }}>
              <ThemedText style={{ 
                color: '#fff',
                fontSize: 9,
                fontWeight: '600'
              }}>
                Loading...
              </ThemedText>
            </View>
          )}
          <ThemedText style={{ color: themeColors.textSecondary }}>
            {`${futureEventsCount} events`}
            {totalCount > 0 && futureEventsCount < totalCount && (
              <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>
                {' '}of {totalCount}
              </ThemedText>
            )}
          </ThemedText>
        </View>
      </ThemedView>
    </View>
  ), [themeColors, isFetchingNextPage, futureEventsCount, totalCount]);

  return (
    <HomeErrorProvider>
      <ThemedView style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Infinite Events List with scrollable header */}
        <InfiniteEventsList
          eventType="attention-required"
          userId={userId}
          pageSize={10}
          enabled={Boolean(userId)}
          renderItem={renderAttentionRequiredItem}
          renderEmptyState={renderEmptyState}
          renderErrorState={renderErrorState}
          useFlashList={true} // Use regular FlatList for better compatibility
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={{ 
            paddingTop: 0, // Remove top padding since header handles spacing
          }}
          containerStyle={{ flex: 1 }}
          testID="attention-required-infinite-list"
        />
      </ThemedView>
    </HomeErrorProvider>
  );
}

/**
 * Migration Summary:
 * 
 * CHANGED (New Implementation):
 * - useInfiniteEventsQuery → useInfiniteAttentionRequiredEvents (simplified)
 * - Object-based params → Direct function parameters  
 * - Complex data extraction → Simple pages.flatMap pattern
 * - Multiple query invalidations → Direct cache updates
 * - Custom query keys → Standardized query keys
 * 
 * PRESERVED (Unchanged):
 * - InfiniteEventsList component usage and all UI components
 * - Header card design and styling
 * - Navigation logic and Stack screen configuration
 * - Event filtering logic (future events only) in renderItem
 * - Individual AttentionRequiredCard rendering
 * - All color scheme and theming
 * - Empty state and error handling messaging
 * - Custom renderItem, renderEmptyState, and renderErrorState functions
 * 
 * BENEFITS:
 * - Single event store reduces memory usage
 * - Direct cache updates improve performance
 * - Simplified query key management  
 * - Better consistency across the app
 * - Reduced cache invalidation complexity
 * - Unified event data handling
 * 
 * OLD INTERFACE:
 * useInfiniteEventsQuery({
 *   eventType: 'attention-required',
 *   userId, pageSize: 10, enabled: Boolean(userId)
 * })
 * 
 * NEW INTERFACE:
 * useInfiniteAttentionRequiredEvents(10)
 */