import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Event from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGetRecommendedEvents } from '@/hooks/useGetRecommendedEvents';
import { Event as EventType } from '@/types/allTypes';
import { useState } from 'react';
import { EventCardSkeleton } from '../Skeleton';
import { useFocusEffect } from '@react-navigation/native';

interface EventSuggestionsProps {
  refreshing: boolean;
  onFinishRefresh: () => void;
}

const EventSuggestions: React.FC<EventSuggestionsProps> = ({ refreshing, onFinishRefresh }) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const { fetchRecommendedEvents, loading, isFirstFetch } = useGetRecommendedEvents();
  const [recommendedEvents, setRecommendedEvents] = useState<EventType[]>([]);

  const fetchEvents = async () => {
    try {
      const events = await fetchRecommendedEvents();
      if (events && Array.isArray(events)) {
        setRecommendedEvents(events);
      }
    } catch (error) {
      console.error('Error fetching recommended events:', error);
    }
    onFinishRefresh();
  };

  // Auto-recovery when screen comes into focus and initial fetch
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        // Force refresh when pull-to-refresh is triggered
        fetchEvents();
      } else {
        // Initial fetch on focus or mount (will use cache if available)
        fetchEvents();
      }
    }, [refreshing])
  );

  // Show skeleton only on first fetch, not on refreshes
  const showSkeleton = isFirstFetch && loading;

  if (showSkeleton) {
    return (
      <ThemedView style={{ width: '100%' }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
          Events You Might Like
        </ThemedText>
        <EventCardSkeleton count={2} />
      </ThemedView>
    );
  }

  if (recommendedEvents.length === 0) {
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
          onPress={fetchEvents}
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
      </ThemedView>

      {/* Event List */}
      <View style={{ flex: 1 }}>
        {recommendedEvents.map((event, index) => (
            <View key={event._id}>
              <Event
                event={event}
                loading={loading}
              />
              {/* Divider Line */}
              {index < recommendedEvents.length - 1 && (
                <View
                  style={{
                    height: 0.3,
                    backgroundColor: Colors[colorScheme ?? 'dark'].border,
                    marginVertical: 16,
                  }}
                />
              )}
            </View>
        ))}
      </View>
    </ThemedView>
  );
};

export default EventSuggestions;