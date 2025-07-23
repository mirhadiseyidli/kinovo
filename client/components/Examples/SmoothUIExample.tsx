import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useUpcomingEventsQuery } from '@/hooks/useUpcomingEventsQuery';
import { useSearchEventsQuery, useCalendarEventsQuery } from '@/hooks/useSmoothUIQueries';

/**
 * Example component demonstrating smooth UI patterns with TanStack Query
 * 
 * This component shows how to use:
 * - select for data transformation without re-renders
 * - placeholderData for smooth loading states
 * - keepPreviousData for smooth transitions
 * - Error states with graceful fallbacks
 */

export const SmoothUIExample: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Example 1: Upcoming events with full smooth UI features
  const upcomingEvents = useUpcomingEventsQuery({
    displayMode: 'full',
    enableSmoothTransitions: true,
    keepPreviousData: true,
    usePlaceholderData: true,
  });

  // Example 2: Search with smooth transitions
  const searchResults = useSearchEventsQuery(searchTerm, searchTerm.length > 2);

  // Example 3: Calendar events with placeholder data
  const calendarEvents = useCalendarEventsQuery(
    new Date().getMonth() + 1, 
    new Date().getFullYear()
  );

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await upcomingEvents.refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Example 1: Upcoming Events with Smooth States */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Upcoming Events (Smooth UI)
        </Text>
        
        {/* State indicators */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {upcomingEvents.isShowingPlaceholder && (
            <Text style={{ color: '#666', fontSize: 12, marginRight: 8 }}>
              📍 Showing placeholder data
            </Text>
          )}
          {upcomingEvents.isShowingPreviousData && (
            <Text style={{ color: '#666', fontSize: 12, marginRight: 8 }}>
              ⏳ Showing previous data
            </Text>
          )}
          {upcomingEvents.isTransitioning && (
            <Text style={{ color: '#666', fontSize: 12, marginRight: 8 }}>
              🔄 Updating...
            </Text>
          )}
        </View>

        {/* Error state with previous data */}
        {upcomingEvents.errorState && (
          <View style={{ 
            backgroundColor: '#ffebee', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 12 
          }}>
            <Text style={{ color: '#c62828', fontSize: 14 }}>
              ⚠️ {upcomingEvents.errorState.errorMessage}
            </Text>
            {upcomingEvents.errorState.canRetry && (
              <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                Showing cached data. Pull to refresh to retry.
              </Text>
            )}
          </View>
        )}

        {/* Events list */}
        {upcomingEvents.data.map((event: any) => (
          <View
            key={event._id}
            style={{
              backgroundColor: event.isPlaceholder ? '#f5f5f5' : '#fff',
              padding: 16,
              borderRadius: 8,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#e0e0e0',
            }}
          >
            <Text style={{ 
              fontSize: 16, 
              fontWeight: 'bold',
              opacity: event.isPlaceholder ? 0.5 : 1 
            }}>
              {event.title}
            </Text>
            <Text style={{ 
              color: '#666', 
              fontSize: 14,
              opacity: event.isPlaceholder ? 0.5 : 1 
            }}>
              {event.displayDate} at {event.displayTime}
            </Text>
            {event.duration && (
              <Text style={{ color: '#666', fontSize: 12 }}>
                Duration: {event.duration}
              </Text>
            )}
            {event.isToday && (
              <Text style={{ color: '#4caf50', fontSize: 12, fontWeight: 'bold' }}>
                📅 Today
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Example 2: Search with Smooth Results */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Search Results (with highlighting)
        </Text>
        
        {/* Search input */}
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
          placeholder="Search events..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {/* Search state */}
        {searchResults.isFetching && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <ActivityIndicator size="small" color="#2196f3" />
            <Text style={{ marginLeft: 8, color: '#666' }}>
              Searching...
            </Text>
          </View>
        )}

        {/* Search results */}
        {searchResults.data.map((event: any) => (
          <View
            key={event._id}
            style={{
              backgroundColor: '#f8f9fa',
              padding: 16,
              borderRadius: 8,
              marginBottom: 8,
              borderLeftWidth: 3,
              borderLeftColor: '#2196f3',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              {event.title}
            </Text>
            <Text style={{ color: '#666', fontSize: 14 }}>
              Relevance: {event.relevanceScore}
            </Text>
          </View>
        ))}
      </View>

      {/* Example 3: Calendar Events with Transform */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
          Calendar Events (Transformed)
        </Text>
        
        {calendarEvents.isLoading && (
          <View style={{ alignItems: 'center', padding: 20 }}>
            <ActivityIndicator size="large" color="#2196f3" />
            <Text style={{ marginTop: 8, color: '#666' }}>
              Loading calendar...
            </Text>
          </View>
        )}

        {calendarEvents.data.map((event: any) => (
          <View
            key={event.id}
            style={{
              backgroundColor: event.color,
              padding: 16,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
              {event.title}
            </Text>
            <Text style={{ color: '#fff', fontSize: 14, opacity: 0.9 }}>
              {event.start.toLocaleString()}
            </Text>
            {event.resource.location && (
              <Text style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>
                📍 {event.resource.location}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Performance indicators */}
      <View style={{ 
        backgroundColor: '#f5f5f5', 
        padding: 16, 
        borderRadius: 8, 
        marginBottom: 32 
      }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
          Performance Indicators
        </Text>
        
        <Text style={{ fontSize: 14, color: '#666' }}>
          • Display Mode: {upcomingEvents.displayMode}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          • Smooth Transitions: {upcomingEvents.enableSmoothTransitions ? 'Enabled' : 'Disabled'}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          • Data Updated: {new Date(upcomingEvents.dataUpdatedAt).toLocaleTimeString()}
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          • Fetch Status: {upcomingEvents.fetchStatus}
        </Text>
      </View>
    </ScrollView>
  );
};

/**
 * Usage Examples:
 * 
 * 1. Basic usage with smooth UI:
 * ```tsx
 * const events = useUpcomingEventsQuery({
 *   displayMode: 'list',
 *   enableSmoothTransitions: true,
 *   keepPreviousData: true,
 *   usePlaceholderData: true,
 * });
 * ```
 * 
 * 2. Search with smooth transitions:
 * ```tsx
 * const searchResults = useSearchEventsQuery(searchTerm, searchTerm.length > 2);
 * ```
 * 
 * 3. Calendar with transformed data:
 * ```tsx
 * const calendarEvents = useCalendarEventsQuery(month, year);
 * ```
 * 
 * 4. Custom display modes:
 * ```tsx
 * // Minimal data for performance
 * const events = useUpcomingEventsQuery({ displayMode: 'minimal' });
 * 
 * // Full data with computed properties
 * const events = useUpcomingEventsQuery({ displayMode: 'full' });
 * 
 * // List optimized for FlatList
 * const events = useUpcomingEventsQuery({ displayMode: 'list' });
 * ```
 */

export default SmoothUIExample;