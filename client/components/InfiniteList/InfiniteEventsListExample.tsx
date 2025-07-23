import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { InfiniteEventsList } from './InfiniteEventsList';
import { Event } from '@/hooks/useInfiniteEventsQuery';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

/**
 * Infinite Events List Example Component
 * 
 * This component demonstrates how to use the InfiniteEventsList component
 * with various configurations and event types.
 */

export const InfiniteEventsListExample: React.FC = () => {
  const [selectedEventType, setSelectedEventType] = useState<'upcoming' | 'past' | 'nearby' | 'friends' | 'recommended'>('upcoming');
  const [useFlashList, setUseFlashList] = useState(true);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Example event types
  const eventTypes = [
    { key: 'upcoming', label: 'Upcoming Events' },
    { key: 'past', label: 'Past Events' },
    { key: 'nearby', label: 'Nearby Events' },
    { key: 'friends', label: 'Friends Events' },
    { key: 'recommended', label: 'Recommended Events' },
  ] as const;

  // Handle event selection
  const handleEventPress = useCallback((event: Event) => {
    setSelectedEvent(event);
    Alert.alert(
      'Event Selected',
      `You selected: ${event.title}`,
      [
        { text: 'OK', onPress: () => setSelectedEvent(null) },
        { text: 'View Details', onPress: () => console.log('View event details:', event) },
      ]
    );
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    console.log('Refreshing events...');
  }, []);

  // Custom event item renderer
  const renderEventItem = useCallback((event: Event, index: number) => {
    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.background,
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 4,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderLeftWidth: 4,
          borderLeftColor: colors.background,
        }}
        onPress={() => handleEventPress(event)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 6,
            }}>
              {event.title}
            </Text>
            
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 4,
            }}>
              📍 {event.location?.text}
            </Text>
            
            <Text style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 4,
            }}>
              📅 {new Date(event.start_time as Date).toLocaleDateString()} at {new Date(event.start_time as Date).toLocaleTimeString()}
            </Text>
            
            <Text style={{
              fontSize: 12,
              color: colors.background,
              fontWeight: '600',
            }}>
              {event.category?.toUpperCase()}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: colors.background,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            marginLeft: 8,
          }}>
            <Text style={{
              color: colors.text,
              fontSize: 10,
              fontWeight: 'bold',
            }}>
              #{index + 1}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, handleEventPress]);

  // Custom empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
      }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
        <Text style={{
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 8,
          textAlign: 'center',
        }}>
          No {selectedEventType} events
        </Text>
        <Text style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
        }}>
          There are no {selectedEventType} events available at the moment.{'\n'}
          Try selecting a different event type or check back later!
        </Text>
      </View>
    );
  }, [colors, selectedEventType]);

  // Custom loading state
  const renderLoadingState = useCallback(() => {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
      }}>
        <View style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}>
          <Text style={{ color: colors.text, fontSize: 24 }}>🔄</Text>
        </View>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 8,
        }}>
          Loading {selectedEventType} events...
        </Text>
        <Text style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
        }}>
          Please wait while we fetch your events
        </Text>
      </View>
    );
  }, [colors, selectedEventType]);

  // Get location for nearby events
  const getLocationConfig = () => {
    if (selectedEventType === 'nearby') {
      return {
        latitude: 37.7749, // San Francisco coordinates as example
        longitude: -122.4194,
        distance: 25,
      };
    }
    return {};
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.text,
          marginBottom: 16,
        }}>
          Infinite Events List Example
        </Text>

        {/* Event Type Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {eventTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={{
                backgroundColor: selectedEventType === type.key ? colors.background : colors.background,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                borderWidth: 1,
                borderColor: selectedEventType === type.key ? colors.background : colors.border,
              }}
              onPress={() => setSelectedEventType(type.key)}
            >
              <Text style={{
                color: selectedEventType === type.key ? colors.text : colors.text,
                fontSize: 14,
                fontWeight: selectedEventType === type.key ? 'bold' : 'normal',
              }}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Configuration Options */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: useFlashList ? colors.background : colors.background,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={() => setUseFlashList(!useFlashList)}
          >
            <Text style={{
              color: useFlashList ? colors.text : colors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              {useFlashList ? '⚡ FlashList' : '📜 FlatList'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: showLoadMoreButton ? colors.background : colors.background,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={() => setShowLoadMoreButton(!showLoadMoreButton)}
          >
            <Text style={{
              color: showLoadMoreButton ? '#fff' : colors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}>
              {showLoadMoreButton ? '🔘 Load More Button' : '♾️ Auto Infinite'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
      <InfiniteEventsList
        eventType={selectedEventType}
        userId="example-user-id"
        pageSize={15}
        useFlashList={useFlashList}
        showLoadMoreButton={showLoadMoreButton}
        renderItem={renderEventItem}
        renderEmptyState={renderEmptyState}
        renderLoadingState={renderLoadingState}
        onItemPress={handleEventPress}
        onRefresh={handleRefresh}
        estimatedItemSize={120}
        onEndReachedThreshold={0.3}
        enableSmooth={true}
        keepPreviousData={true}
        staleTime={1000 * 60 * 5} // 5 minutes
        gcTime={1000 * 60 * 30} // 30 minutes
        testID="example-infinite-events-list"
        {...getLocationConfig()}
      />

      {/* Debug Info */}
      {__DEV__ && (
        <View style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          borderRadius: 8,
          zIndex: 1000,
        }}>
          <Text style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>
            Debug Info
          </Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>
            Event Type: {selectedEventType}
          </Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>
            List Type: {useFlashList ? 'FlashList' : 'FlatList'}
          </Text>
          <Text style={{ color: '#fff', fontSize: 10 }}>
            Load More: {showLoadMoreButton ? 'Button' : 'Auto'}
          </Text>
          {selectedEvent && (
            <Text style={{ color: '#fff', fontSize: 10 }}>
              Selected: {selectedEvent.title}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default InfiniteEventsListExample;