import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import EventComponent from '@/components/Event';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useGetMyEvents } from '@/hooks/useGetMyEvents';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import { Event } from '@/types/allTypes';
import { useRouter } from 'expo-router';
import { useEventContext } from '@/context/UserSessionContext';
import { EventCardSkeleton } from '../Skeleton';

const UpcomingEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = React.memo(({ refreshing, onFinishRefresh }) => {
  const { fetchMyEvents, loading, isFirstFetch, clearCache, myEventsList } = useGetMyEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [localEventsList, setLocalEventsList] = useState<Event[]>(myEventsList || []);
  const router = useRouter();
  const { refreshing: contextRefreshing } = useEventContext();

  const navigateToCalendar = React.useCallback(() => {
    router.push('/(auth)/(tabs)/calendar')
  }, [router]);

  const navigateToCreateEvent = React.useCallback(() => {
    router.push('/(auth)/(createEvent)/EventDetails')
  }, [router]);
  
  const fetchEvents = React.useCallback(async (forceRefresh: boolean = false) => {
    try {
      // Backend optimization: Pass fromHomeScreen=true to limit response to first 3 events
      const upcomingEvents = await fetchMyEvents(true, forceRefresh);
      if (upcomingEvents && Array.isArray(upcomingEvents)) {
        setLocalEventsList(upcomingEvents);
      } else {
        setLocalEventsList([]);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming events:', error);
      setLocalEventsList([]);
    } finally {
      onFinishRefresh();
    }
  }, [fetchMyEvents, onFinishRefresh]);
  
  // Fetch events when explicitly refreshing
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        // Force refresh when pull-to-refresh is triggered
        fetchEvents(true);
      } else {
        // Normal fetch (will use cache if available)
        fetchEvents(false);
      }
    }, [refreshing, fetchEvents])
  );

  // Update local state when hook state changes
  useEffect(() => {
    if (myEventsList) {
      setLocalEventsList(myEventsList);
    }
  }, [myEventsList]);

  // Clear cache when context signals a refresh is needed
  useEffect(() => {
    if (contextRefreshing) {
      clearCache();
    }
  }, [contextRefreshing, clearCache]);

  // Show skeleton only on first fetch, not on refreshes
  const showSkeleton = isFirstFetch && loading;

  console.log('upcomingEventsList', localEventsList);

  return (
    <ThemedView style={{ flex: 1, width: '100%' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold' }}>Upcoming Events</ThemedText>
        <TouchableOpacity 
          style={{ alignItems: 'center', backgroundColor: 'transparent' }}
          onPress={navigateToCalendar}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 16, marginRight: 4 }}>View Calendar</ThemedText>
            <IconSymbol
              name="chevron.right"
              size={12}
              color={Colors[colorScheme ?? 'dark'].tint}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Event List */}
      {showSkeleton ? (
        <EventCardSkeleton count={2} />
      ) : (
        <View style={{ flex: 1 }}>
          {localEventsList.length > 0 ? (
            <View style={{ gap: 16 }}>
              {localEventsList.map((event, index) => (
                <View key={`${event._id}-${index}`}>
                  <EventComponent event={event} loading={refreshing || loading}/>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              onPress={navigateToCreateEvent}
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
            >
              <View style={{ marginBottom: 12 }}>
                <IconSymbol
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
                No upcoming events yet
              </ThemedText>
              <ThemedText 
                style={{ 
                  fontSize: 14, 
                  color: themeColors.placeholderTextColor,
                  textAlign: 'center',
                  opacity: 0.8
                }}
              >
                Tap here to create your first event! 
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ThemedView>
  );
});

export default UpcomingEvents;
