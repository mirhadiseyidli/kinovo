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
import { useEventContext } from '@/context/EventContext';
import { UpcomingEventsSkeleton } from '../Skeleton';

const UpcomingEvents: React.FC<{ refreshing: boolean; onFinishRefresh: () => void }> = React.memo(({ refreshing, onFinishRefresh }) => {
  const { fetchMyEvents, loading } = useGetMyEvents();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const [myEventsList, setMyEventsList] = useState<Event[]>([]);
  const router = useRouter();
  const { events, eventOccurrences, refreshing: contextRefreshing } = useEventContext();

  if (!myEventsList) {
    <ThemedText>Could't load events</ThemedText>
  };

  const navigateToCalendar = () => {
    router.push('/(auth)/(tabs)/calendar')
  }

  const navigateToCreateEvent = () => {
    router.push('/(auth)/(createEvent)/EventDetails')
  }
  
  const fetchEvents = async () => {
    const upcomingEvents = await fetchMyEvents();
    if (upcomingEvents && Array.isArray(upcomingEvents)) {
      setMyEventsList(upcomingEvents);
    } else {
      setMyEventsList([]);
    }
    onFinishRefresh();
  }
  
  // Fetch events when explicitly refreshing
  useFocusEffect(
    React.useCallback(() => {
      if (refreshing) {
        fetchEvents();
      }
    }, [refreshing])
  );

  // Automatically refresh events when the events context changes
  useEffect(() => {
    if (!refreshing && !contextRefreshing) {
      fetchEvents();
    }
  }, [events, eventOccurrences]);

  if (loading || refreshing) {
    return <UpcomingEventsSkeleton />;
  }

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
      <View style={{ flex: 1 }}>
        {myEventsList.length > 0 ? (
          <View style={{ gap: 16 }}>
            {myEventsList.map((event, index) => (
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
    </ThemedView>
  );
});

export default UpcomingEvents;
