import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useGetEventById } from '@/hooks/useGetEventById';
import EventImage from '@/components/ViewEvent/EventImage';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import EventDetailsSection from '@/components/ViewEvent/EventDetails';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setStoryPlaying } from '@/store/eventPlayStorySlice';
import { useIsFocused } from '@react-navigation/native';
import { CreateEventProvider } from '@/context/CreateEventContext';

const ViewEvent = () => {
  const { event_id, fromStory, occurrence_start, occurrence_end, is_occurrence } = useLocalSearchParams();
  const id = Array.isArray(event_id) ? event_id[0] : event_id;
  const { event, loading, error } = useGetEventById(id);
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  // Create modified event for recurring occurrences
  const displayEvent = React.useMemo(() => {
    if (!event) return null;
    
    // If this is a recurring occurrence, modify the event data to show the occurrence date
    if (is_occurrence === 'true' && occurrence_start && occurrence_end) {
      const startDate = Array.isArray(occurrence_start) ? occurrence_start[0] : occurrence_start;
      const endDate = Array.isArray(occurrence_end) ? occurrence_end[0] : occurrence_end;
      
      return {
        ...event,
        start_time: new Date(startDate),
        end_time: new Date(endDate),
        isRecurringOccurrence: true,
        originalEventId: event._id
      };
    }
    
    return event;
  }, [event, is_occurrence, occurrence_start, occurrence_end]);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | null = null;

      if (fromStory === "true") {
        unsubscribe = navigation.addListener('beforeRemove', () => {
          dispatch(setStoryPlaying(true));
        });
      }

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [fromStory, navigation, dispatch])
  );

  // Return null when not focused to prevent state updates
  if (!isFocused) {
    return null;
  }

  // Show loading state
  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>Loading...</Text>
      </ThemedView>
    );
  }

  // Show error state
  if (error || !displayEvent) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: themeColors.text }}>
          {error || 'Event not found'}
        </Text>
      </ThemedView>
    );
  }

  // Show event details
  return (
    <CreateEventProvider>
      <ThemedView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            width: '100%',
            paddingBottom: insets.bottom 
          }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}  // Optimize memory usage
        >
          <View style={{ width: '100%', paddingTop: 32 }}>
            <View style={{ alignItems: 'center', borderRadius: 16, overflow: 'hidden' }}>
              <EventImage 
                event_picture={displayEvent.event_picture ?? null} 
                category={displayEvent.category}
              />
            </View>
          </View>
          <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
            <EventDetailsSection event={displayEvent} />
          </View>
        </ScrollView>
      </ThemedView>
    </CreateEventProvider>
  );
};

export default ViewEvent;